
import subprocess

def get_staged_files():
    result = subprocess.run(['git', 'diff', '--cached', '--name-only'], capture_output=True, text=True)
    return result.stdout.splitlines()

def check_ignored_staged():
    staged = get_staged_files()
    if not staged:
        return
        
    # git check-ignore --stdin
    process = subprocess.Popen(['git', 'check-ignore', '--stdin'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate(input='\n'.join(staged))
    
    ignored_but_staged = stdout.splitlines()
    if ignored_but_staged:
        print(f"Found {len(ignored_but_staged)} files that are staged but should be ignored:")
        for f in ignored_but_staged[:20]:
            print(f)
        if len(ignored_but_staged) > 20:
            print("...")
    else:
        print("No staged files are ignored by .gitignore.")

if __name__ == "__main__":
    check_ignored_staged()
