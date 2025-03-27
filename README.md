# PorcosLauncher

PorcosLauncher is a Minecraft Launcher designed for the Porcos Server. It provides a user-friendly interface to manage Minecraft instances, download versions, and launch the game.

## Features
- Manage multiple Minecraft instances
- Download and update Minecraft versions
- Customize installation directories
- Console output for debugging
- Electron-based UI with custom window controls

## Project Structure
- **src/**: Contains the main source code including IPC handlers, configuration, and launcher logic.
- **assets/**: Includes images and icons used in the application.
- **styles/**: CSS files for styling the application.
- **dist/**: Output directory for build artifacts.

## Dependencies
- Electron
- Electron Builder
- Minecraft Launcher Core
- Various utility libraries (e.g., adm-zip, cheerio)

## Setup and Execution

### Development
1. Clone the repository:
   ```bash
   git clone https://github.com/PorcosTeam/PorcosLauncher.git
   ```
2. Navigate to the project directory:
   ```bash
   cd PorcosLauncher
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

### Build
1. Build the application using Electron Builder:
   ```bash
   npm run build
   ```

## Installer Configuration
- Custom icons and images are used for the installer.
- Allows changing the installation directory.

## Author
Porcos Team

## License
This project is licensed under the MIT License.