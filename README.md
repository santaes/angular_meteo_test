# 🌤️ Angular Meteo Dashboard

# Screenshot is located in the /assets folder as "screenshot.png"

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
   git clone 'https://github.com/santaes/angular_meteo_test'
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

### Data Source

The application loads data from the root `data.yml` file with the following structure:
- Power values in MW (Megawatts)
- Temperature values in dK (deciKelvin)
- Data points recorded at 5-second intervals

The YAML file should follow this structure:

```yaml
power:
  unit: 'MW'
  values:
    - { time: '00:00:00', value: 54.5 }
    - { time: '00:00:05', value: 54.7 }
    # ... more data points

temperature:
  unit: 'dK'
  values:
    - { time: '00:00:00', value: 2920 }
    - { time: '00:00:05', value: 2921 }
    # ... more data points
```

### Key Features

- **Real-time Data Processing**
  - Loads and parses YAML data
  - Converts MW to kWh for energy display
  - Converts deciKelvin to Celsius for temperature
  - Handles data synchronization between power and temperature metrics

- **Error Handling**
  - Graceful fallback to simulated data on errors
  - Comprehensive error logging
  - Data validation and bounds checking

### Key Components

- **app.ts**: Main application component with data handling and processing logic
- **app.component.html**: UI layout and templates with responsive design
- **app.component.scss**: Styling and theming
- **data.yml**: Data source file in the project root

## 🏗️ Project Structure

```
angular_meteo_test/
├── data.yml                  # Main data source file
├── src/
│   ├── app/
│   │   ├── app.ts           # Main application component
│   │   ├── app.component.html # Main template
│   │   └── app.component.scss # Styles
│   ├── assets/              # Static assets
│   └── styles.scss          # Global styles
├── tsconfig.doc.json        # Documentation config
└── package.json             # Project dependencies
```

## 📊 Data Processing

The application processes data with the following conversions:

1. **Power Conversion**
   - Input: MW (Megawatts)
   - Output: kWh (kilowatt-hours)
   - Formula: `kWh = MW * 1000 * (5/3600)` (for 5-second intervals)

2. **Temperature Conversion**
   - Input: dK (deciKelvin)
   - Output: °C (Celsius)
   - Formula: `°C = (dK / 10) - 273.15`

## 🧪 Development


##  Testing

# Run tests
npm run test / ng test

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Build for production
ng build --configuration production
```

### Documentation

Generate project documentation using Compodoc:
```bash
npx compodoc -p tsconfig.doc.json --disableSourceCode
```

Documentation will be available at `http://localhost:8080`

## 🚀 Deployment

1. Build the application:
   ```bash
   ng build --configuration production
   ```
   
2. The production build will be available in the `dist/` directory.

3. For deployment, serve the contents of the `dist/` directory using any static file server, such as:
   ```bash
   npx serve -s dist/angular-meteo-test
   ```
   
   Or deploy to platforms like:
   - Vercel
   - Netlify
   - GitHub Pages
   - Firebase Hosting

