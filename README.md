# 🌤️ Angular Meteo Dashboard

A real-time monitoring dashboard for energy production and temperature data, built with Angular 20.3.0. This application displays live data visualizations and historical metrics in an intuitive interface.

## ✨ Features

- **Real-time Data Display**
  - Current power production in kWh
  - Current temperature in °C
  - Auto-updates every 5 seconds

- **Interactive Charts**
  - Energy production trends
  - Temperature variations
  - Hover tooltips for exact values

- **Data Table**
  - Paginated historical data
  - Sortable columns
  - Responsive design
  - Customizable items per page

- **Responsive Design**
  - Works on desktop and mobile devices
  - Adaptive layout
  - Touch-friendly controls

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or Yarn
- Angular CLI (v20.3.0 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd angular_meteo_test
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```

4. Open your browser and navigate to `http://localhost:4200/`

## 📊 Data Structure

The application uses simulated data with the following structure:

```typescript
interface DataPoint {
  time: string;        // Format: "HH:MM:SS"
  value: number;       // Raw value
}

interface YamlData {
  power: {
    unit: string;      // "MW"
    values: DataPoint[];
  };
  temperature: {
    unit: string;      // "dK" (deciKelvin)
    values: DataPoint[];
  };
}
```

## 🛠️ Development

### Data Simulation

The application includes a built-in data simulator that generates 24 hours of sample data with 5-second intervals. The data includes:
- Power values between 54.5 and 56.0 MW
- Temperature values between 292.0K and 293.0K (18.85°C to 19.85°C)

### Key Components

- **app.component.ts**: Main application logic and data handling
- **app.component.html**: UI layout and templates
- **app.component.scss**: Styling and theming

## 🏗️ Project Structure

```
src/
├── app/
│   ├── app.component.ts      # Main application component
│   ├── app.component.html    # Main template
│   ├── app.component.scss    # Styles
│   └── app.config.ts         # Application configuration
├── assets/
│   └── data/                # Data files
└── styles.scss              # Global styles
```

## 🧪 Testing

Run unit tests:
```bash
ng test
```

Run end-to-end tests:
```bash
ng e2e
```

## 🚀 Deployment

Build for production:
```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Angular](https://angular.io/)
- Icons by [Font Awesome](https://fontawesome.com/)
- Charts rendered with SVG

---

<div align="center">
  Made with ❤️ by [Your Name]
</div>

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
