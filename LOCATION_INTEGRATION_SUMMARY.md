# Location Integration Summary

This document summarizes the integration of the LocationSection component into the StoryCore dashboard.

## What Was Implemented

### 1. Location Store API Integration (`creative-studio-ui/src/stores/locationStore.ts`)

Updated the location store to connect to the backend API:

- **API Configuration**: Added `API_BASE_URL` constant pointing to `http://localhost:8080`
- **fetchApi Helper**: Created a typed fetch wrapper with error handling
- **Async CRUD Actions**:
  - `fetchLocations()` - GET `/api/locations`
  - `addLocation()` - POST `/api/locations`
  - `updateLocation()` - PUT `/api/locations/{id}`
  - `deleteLocation()` - DELETE `/api/locations/{id}`
  - `updateCubeTexture()` - POST `/api/locations/{id}/cube-textures`
- **Error Handling**: Added error state and proper error handling for all API calls
- **Loading States**: Added `isLoading` and `isSaving` states

### 2. CubeFaceGenerator ComfyUI Integration (`creative-studio-ui/src/components/location/editor/CubeFaceGenerator.tsx`)

Updated to call ComfyUI API for actual image generation:

- **API Configuration**: Added `COMFYUI_API_URL` constant
- **ComfyUI Workflow**: Implemented `generateWithComfyUI()` function that:
  - Builds a proper ComfyUI workflow JSON for text-to-image
  - Handles all 6 cube faces (front, back, left, right, top, bottom)
  - Supports generation settings (width, height, steps, CFG scale, seed)
  - Falls back to mock images if ComfyUI is unavailable
- **Progress Tracking**: Added progress indicator during generation
- **Updated Props**: Added `locationId` prop for API integration

### 3. LocationSection Component (`creative-studio-ui/src/components/location/LocationSection.tsx`)

Enhanced with proper API integration:

- **Auto-fetch**: Added `autoFetch` prop to automatically load locations on mount
- **Async Operations**: Updated CRUD operations to use async/await
- **Error Display**: Added error message display with retry option
- **Refresh Button**: Added manual refresh capability

### 4. Backend API (`backend/location_api.py`)

The backend already has all necessary endpoints:

- `POST /api/locations` - Create location
- `GET /api/locations` - List all locations
- `GET /api/locations/{id}` - Get location by ID
- `PUT /api/locations/{id}` - Update location
- `DELETE /api/locations/{id}` - Delete location
- `POST /api/locations/{id}/cube-textures` - Generate cube textures

## Testing the Complete Workflow

### 1. Start the Backend Server
```bash
cd backend
python location_api.py
# Or use the main server that includes location endpoints
```

### 2. Start ComfyUI (for image generation)
```bash
cd comfyui_portable
python main.py
```

### 3. Start the Frontend
```bash
cd creative-studio-ui
npm run dev
```

### 4. Test the Flow

1. **Create a new location**:
   - Click "Create New Location" button
   - Enter name (e.g., "Forest Clearing")
   - Select type (exterior/interior)
   - Add description and atmosphere
   - Click Save

2. **Generate cube face textures**:
   - Click on the created location
   - Go to the "Cube" tab
   - Select a face (front, back, left, right, top, bottom)
   - Enter a prompt describing the view
   - Click "Generate Image"
   - ComfyUI will generate the image
   - Click "Apply" to save the texture

3. **Configure skybox settings**:
   - Go to the "Skybox" tab
   - Adjust skybox parameters

4. **Place location in scene**:
   - Go to the "Scene" tab
   - Set transform coordinates
   - Save to place in 3D scene

## Component Structure

```
creative-studio-ui/src/components/location/
├── index.ts                    # Exports all location components
├── LocationSection.tsx         # Main section wrapper
├── LocationSection.css         # Section styles
├── LocationList.tsx           # List of locations with filters
├── LocationList.css
├── LocationCard.tsx           # Individual location card
├── LocationCard.css
├── LocationEditor.tsx         # Tabbed editor for location properties
├── LocationEditor.css
├── SkyboxPanel.tsx            # Skybox configuration
├── SkyboxPanel.css
├── LocationAssetsPanel.tsx     # Manage placed assets
├── LocationAssetsPanel.css
└── editor/
    ├── CubeViewEditor.tsx     # 3D cube view editor
    ├── CubeViewEditor.css
    ├── CubeFaceGenerator.tsx  # ComfyUI integration for textures
    └── CubeFaceGenerator.css
```

## Environment Variables

Configure these in your `.env` file:

```env
# Backend API
VITE_API_URL=http://localhost:8080

# ComfyUI
VITE_COMFYUI_API_URL=http://127.0.0.1:8188
```

## API Response Format

### Location Object
```json
{
  "location_id": "uuid",
  "name": "Forest Clearing",
  "location_type": "exterior",
  "texture_direction": "outward",
  "metadata": {
    "description": "A peaceful clearing in the forest",
    "atmosphere": "Serene, natural",
    "genre_tags": ["fantasy", "nature"]
  },
  "cube_textures": {
    "front": {
      "id": "uuid",
      "face": "front",
      "image_path": "/generated/xxx/front.png",
      "generated_at": "2024-01-01T00:00:00Z",
      "generation_params": {
        "prompt": "Forest view from clearing",
        "width": 512,
        "height": 512,
        "steps": 20,
        "cfg_scale": 7,
        "seed": 12345
      }
    }
  },
  "placed_assets": [],
  "is_world_derived": false
}
```

## Troubleshooting

### API Not Responding
- Check backend server is running on port 8080
- Verify CORS is configured for frontend origin

### ComfyUI Generation Fails
- Check ComfyUI is running on port 8188
- Verify required models are installed
- Check ComfyUI logs for errors

### Locations Not Loading
- Check browser console for API errors
- Verify database/locations directory exists
- Check file permissions for location storage
