$ErrorActionPreference = "Continue"
npx vite build 2>&1 | Out-File -FilePath "build_error.txt" -Encoding utf8
