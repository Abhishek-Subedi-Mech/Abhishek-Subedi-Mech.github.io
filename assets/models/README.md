# 3D Model Files

Place SolidWorks STL exports here to enable the interactive 3D viewers on the website.

## How to export from SolidWorks

1. Open the assembly file
2. **File → Save As**
3. Set file type to **STL (*.stl)**
4. Click **Options** → select **Binary** format (smaller file size)
5. Set resolution to **Coarse** or **Medium** (fine will be too large for web)
6. Click OK → Save

## Required files

| File to save as       | SolidWorks source file                        |
|-----------------------|-----------------------------------------------|
| `v6_engine.stl`       | `Engine Assembly/V6 Engine Assembly.SLDASM`   |
| `pto_gearbox.stl`     | `pto gear box/PTO Gear Box Assembly.SLDASM`   |
| `f1_car.stl`          | `F1/F1 Assembly.SLDASM`                       |
| `f16_falcon.stl`      | `F-16 Fighting Falcon/F-16 Fighting Falcon.SLDASM` |

## Tips

- Use **Coarse** resolution to keep file size under ~10MB per model
- If a model is very heavy, export individual key parts instead of the full assembly
- The 3D viewer uses Three.js with OrbitControls — drag to rotate, scroll to zoom
