# ComfyUI Setup - 30 Seconds

**Fastest possible setup guide**

## 1. Which Port? (10 seconds)

```bash
curl http://localhost:8000/system_stats  # Desktop
curl http://localhost:8188/system_stats  # Manual
```

**Whichever responds = your port!**

## 2. Enable CORS (10 seconds)

**Desktop**: Settings → Enable CORS header → `*` → Restart

**Manual**: Add `--enable-cors-header --cors-header-value=*` when starting

## 3. Configure UI (10 seconds)

Creative Studio UI → Settings → ComfyUI Instances → Add:
- Host: `localhost`
- Port: `8000` or `8188` (from step 1)
- GPU: `auto`

**Test Connection** → Should show ✅

---

**Done!** 

Need more help? → [Full Guides](COMFYUI_README.md)
