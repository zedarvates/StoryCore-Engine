# How the End User Launches the Software

## 🎯 Quick Answer

**For the end user, it's simple:**

1. **Double-click** on `StoryCore Creative Studio-Setup-1.0.0.exe`
2. **Follow the installation** (like any Windows software)
3. **Double-click** on the "StoryCore Creative Studio" icon on the desktop

**That's it!** 🎉

---

## 📦 Detailed Steps

### Step 1: Get the Installer

The user receives the file:
```
StoryCore Creative Studio-Setup-1.0.0.exe
```

**Size:** ~150-200 MB

### Step 2: Installation

1. **Double-click** on the `.exe` file
2. **Windows SmartScreen** may display a warning:
   - Click on "More information"
   - Click on "Run anyway"
   - (Normal for unsigned applications)

3. **Setup wizard** opens:
   ```
   ┌─────────────────────────────────────┐
   │  StoryCore Creative Studio Setup    │
   ├─────────────────────────────────────┤
   │                                     │
   │  Choose installation folder:        │
   │  C:\Program Files\StoryCore...      │
   │                                     │
   │  ☑ Create desktop shortcut         │
   │  ☑ Create Start Menu shortcut       │
   │                                     │
   │  [Cancel]  [Install]                │
   └─────────────────────────────────────┘
   ```

4. **Click on "Install"**
5. **Wait** 10-30 seconds
6. **Click on "Finish"**

### Step 3: First Launch

**Method 1 - Desktop Shortcut (SIMPLER):**
```
Windows Desktop
├── 📁 This PC
├── 📁 Recycle Bin
└── 🎬 StoryCore Creative Studio  ← Double-click here!
```

**Method 2 - Start Menu:**
1. Click on the Windows button (bottom left)
2. Type "StoryCore"
3. Click on "StoryCore Creative Studio"

**Method 3 - Executable File:**
1. Open Windows Explorer
2. Go to `C:\Program Files\StoryCore Creative Studio`
3. Double-click on `StoryCore Creative Studio.exe`

### Step 4: Usage

The application opens and displays:

```
┌────────────────────────────────────────────┐
│  🎬 StoryCore Creative Studio              │
├────────────────────────────────────────────┤
│                                            │
│  Welcome to StoryCore Creative Studio      │
│                                            │
│  ┌──────────────────┐  ┌──────────────┐   │
│  │ Create New       │  │ Open Existing│   │
│  │ Project          │  │ Project      │   │
│  └──────────────────┘  └──────────────┘   │
│                                            │
│  Recent Projects:                          │
│  • My First Project                        │
│  • Demo Video                              │
│                                            │
└────────────────────────────────────────────┘
```

**The user can:**
- ✅ Create a new project
- ✅ Open an existing project
- ✅ Access recent projects

---

## 🔄 Subsequent Launches

After the first installation, the user simply:

**Double-click on desktop icon** 🎬

Or:

**Start Menu → StoryCore Creative Studio**

**Startup time:** 2-5 seconds

---

## 🗑️ Uninstallation

If the user wants to uninstall:

**Method 1 - Windows Settings:**
1. Open "Windows Settings"
2. Go to "Apps"
3. Search for "StoryCore Creative Studio"
4. Click on "Uninstall"

**Method 2 - Control Panel:**
1. Open "Control Panel"
2. Go to "Programs and Features"
3. Find "StoryCore Creative Studio"
4. Right-click → "Uninstall"

---

## 📊 Comparison: Developer vs End User

| Aspect | Developer | End User |
|--------|-----------|----------|
| **Installation** | `npm install` | Double-click on .exe |
| **Launch** | `npm run dev` | Double-click on icon |
| **Prerequisites** | Node.js, npm, Git | None |
| **Startup time** | 5-10 seconds | 2-5 seconds |
| **Update** | `git pull` | New .exe |
| **Size** | ~500 MB (with node_modules) | ~200 MB |

---

## 🎯 Instructions for End User (to share)

Here's the text to send to users:

```
=== STORYCORE CREATIVE STUDIO INSTALLATION ===

1. Download the file "StoryCore Creative Studio-Setup-1.0.0.exe"

2. Double-click on the downloaded file

3. If Windows displays a security warning:
   - Click on "More information"
   - Then click on "Run anyway"

4. Follow the installation wizard:
   - Choose the installation folder (or leave default)
   - Check "Create desktop shortcut"
   - Click on "Install"

5. Once installation is complete, double-click on the
   "StoryCore Creative Studio" icon on your desktop

That's it! The application is ready to use.

=== USAGE ===

On first launch:
- Click "Create New Project" to create a new project
- Or "Open Existing Project" to open an existing project

Recent projects will automatically appear on the home page.

=== SUPPORT ===

If you encounter any problems, contact: support@storycore.com
```

---

## 🚀 To Create the Installer (Developer)

**Simple Method:**
```bash
# Double-click on this file:
build-windows-exe.bat
```

**Manual Method:**
```bash
npm run package:win
```

**Result:**
```
release/
└── StoryCore Creative Studio-Setup-1.0.0.exe  ← Distribute this file
```

---

## ✅ Distribution Checklist

Before distributing the installer:

- [ ] Test on a clean Windows PC (without Node.js)
- [ ] Verify installation works
- [ ] Verify application starts
- [ ] Test project creation
- [ ] Test project opening
- [ ] Verify uninstallation
- [ ] Prepare user instructions
- [ ] Choose a distribution channel (email, website, etc.)

---

## 🎉 Summary

**For the end user, it's as simple as:**

1. 📥 Download the .exe file
2. 🖱️ Double-click to install
3. 🎬 Double-click on the icon to launch

**No technical knowledge required!**

**No prerequisites to install!**

**Works like any Windows software!**

---

**Ready to create the installer?**

Simply run:
```bash
build-windows-exe.bat
```

Or:
```bash
npm run package:win
```

And share the created file in `release/` with your users! 🚀

