# Interface

Web-based dashboard for real-time monitoring and control of Liquid Metal pump systems. This interface provides visualization of sensor data, live probe readings, and control mechanisms for the pump system.

## Features

- **Real-time Data Visualization**: Multi-probe chart displaying live sensor readings
- **Session Management**: Store and review historical pump operation sessions
- **Bluetooth/UART Terminal**: Direct communication with pump hardware
- **Live Monitoring**: Real-time probe data streaming and visualization
- **Dark/Light Mode**: Customizable color scheme for different viewing preferences

## Tech Stack

- **Framework**: Next.js with App Router
- **UI Library**: Mantine UI
- **Styling**: CSS Modules, PostCSS
- **Package Manager**: pnpm or npm

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - Reusable UI components (charts, terminals, controls)
- `/data` - Session data and calibration files
- `/lib` - Utility functions and helpers
- `/hooks` - Custom React hooks

## Related Projects

- [Simulations](https://github.com/p4p-project-51/Simulations) - Simulations that are used for our project
- [Orchestrator](https://github.com/p4p-project-51/Orchestrator) - Firmware for aggregating inputs and controlling the Liquid Metal pump
- My Capstone project, which the graphing code is based off of
