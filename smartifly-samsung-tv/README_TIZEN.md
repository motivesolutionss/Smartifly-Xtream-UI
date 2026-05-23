# Tizen Deployment Guide - Smartifly

This guide explains how to package and deploy the Smartifly Tizen Web Application to a Samsung Smart TV.

## 1. Prerequisites

- **Tizen Studio** (with Samsung TV Extensions)
- **Samsung Certificate Extension**
- **Vite Build**: You must build the React app first.

## 2. Prepare the Build

Run the following command to generate the production build:

```bash
npm run build
```

This will create a `dist` folder.

## 3. Package the App (.wgt)

1. Open **Tizen Studio**.
2. Go to **File > Import > Tizen > Web Project**.
3. Select the root folder of this repository.
4. Ensure `config.xml` is in the root.
5. Right-click the project in Project Explorer and select **Build Package**.
6. A `.wgt` file will be generated in the root.

## 4. Deploy to TV

### A. Enable Developer Mode on TV
1. Open the **Smart Hub**.
2. Navigate to **Apps**.
3. Press **1, 2, 3, 4, 5** on the remote.
4. Toggle **Developer Mode** to **ON**.
5. Enter the **Host PC IP** (your computer's IP).
6. **Restart the TV** (Hold Power button on remote).

### B. Connect from Tizen Studio
1. Open **Device Manager** in Tizen Studio.
2. Click the **Remote Device Manager** icon (top right).
3. Click **+** and add your TV's IP.
4. Toggle **Connection** to **ON**.

### C. Run the App
1. Right-click the project in Tizen Studio.
2. Select **Run As > Tizen Web Application**.
3. Select your TV as the target.

## 5. Required Privileges (Included)

The following privileges are already configured in `config.xml`:
- `internet`: Network access.
- `tv.inputdevice`: Remote control support.
- `mediaplay`: Standard media playback.
- `avplay`: High-performance Samsung video engine.
- `productinfo`: Access to device hardware details.

## 6. Performance Notes

- This app uses **Virtualization** for lists. Avoid modifying the grid without testing on lower-end hardware (e.g. 2021 models).
- High-bitrate streams should use the **AVPlay** engine (which is already integrated).
