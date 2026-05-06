from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
import asyncio
import sys
from pathlib import Path
from argparse import Namespace

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.cli.core import CLICore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cli", tags=["cli"])


class CLIRequest(BaseModel):
    command: str
    args: Dict[str, Any]


class CLIResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("", response_model=CLIResponse)
@router.post("/", response_model=CLIResponse)
async def invoke_cli_command(request: CLIRequest):
    """
    Invokes a StoryCore CLI command from the web API.
    """
    logger.info(f"Invoking CLI command: {request.command} with args {request.args}")

    try:
        # Initialize CLI Core
        cli = CLICore(lazy_load=True)
        cli.setup_parser()
        cli.register_handlers()

        # Get the handler and its parser
        cmd_name = request.command
        handler = cli.registry.get_handler(cmd_name)

        # Try finding by hyphenated/underscored if not found
        if not handler:
            if "_" in cmd_name:
                alt_name = cmd_name.replace("_", "-")
                handler = cli.registry.get_handler(alt_name)
                if handler:
                    cmd_name = alt_name
            elif "-" in cmd_name:
                alt_name = cmd_name.replace("-", "_")
                handler = cli.registry.get_handler(alt_name)
                if handler:
                    cmd_name = alt_name

        if not handler:
            return CLIResponse(
                success=False,
                error=f"Unknown command: {request.command}. Available: {cli.registry.list_commands()}",
            )

        # We need the subparser for this command to get defaults and validation
        subparser = None
        for action in cli.parser._subparsers._group_actions:
            if hasattr(action, "choices") and cmd_name in action.choices:
                subparser = action.choices[cmd_name]
                break

        if not subparser:
            # Fallback to manual Namespace if subparser not found
            args = Namespace(
                verbose=False,
                quiet=True,
                log_level="INFO",
                command=cmd_name,
                **request.args,
            )
        else:
            # Convert request.args (dict) to a list of strings for argparse
            argv = []
            for k, v in request.args.items():
                flag = f"--{k.replace('_', '-')}"
                if isinstance(v, list):
                    argv.append(flag)
                    argv.extend([str(i) for i in v])
                elif isinstance(v, bool):
                    if v:
                        argv.append(flag)
                else:
                    argv.append(flag)
                    argv.append(str(v))

            try:
                # Parse the arguments using the command's subparser
                # We use parse_known_args to be lenient
                args, _ = subparser.parse_known_args(argv)
                # Add back the global defaults
                args.verbose = getattr(args, "verbose", False)
                args.quiet = getattr(args, "quiet", True)
                args.log_level = getattr(args, "log_level", "INFO")
                args.command = cmd_name
            except Exception as e:
                return CLIResponse(success=False, error=f"Argument parsing error: {e}")

        # Capture stdout to get the command output
        import io
        from contextlib import redirect_stdout

        captured_output = io.StringIO()
        try:
            # Run in thread to avoid blocking the API
            def run_command():
                with redirect_stdout(captured_output):
                    # Use execute_with_hooks if possible, or fall back to execute
                    if hasattr(handler, "execute_with_hooks"):
                        return handler.execute_with_hooks(args)
                    else:
                        return handler.execute(args)

            exit_code = await asyncio.to_thread(run_command)
            output_text = captured_output.getvalue().strip()

            if exit_code == 0:
                # If the handler stored a last_output, use it, otherwise use captured stdout
                data = {
                    "output": getattr(handler, "last_output", output_text),
                    "args": vars(args),
                }
                return CLIResponse(success=True, data=data)
            else:
                return CLIResponse(
                    success=False,
                    error=f"Command exited with code {exit_code}",
                    data={"output": output_text},
                )
        except Exception as e:
            logger.error(f"Execution error for {cmd_name}: {e}", exc_info=True)
            return CLIResponse(success=False, error=f"Execution error: {str(e)}")

    except Exception as e:
        logger.error(f"General error in invoke_cli_command: {e}", exc_info=True)
        return CLIResponse(success=False, error=str(e))
