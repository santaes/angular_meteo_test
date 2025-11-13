import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

interface DataPoint {
  time: string;
  value: number;
}

interface YamlData {
  power: {
    unit: string;
    values: DataPoint[];
  };
  temperature: {
    unit: string;
    values: DataPoint[];
  };
}

interface MinuteData {
  timestamp: number;  // Unix timestamp in milliseconds
  displayTime: string; // Formatted time string
  powerKWh: number;
  tempCelsius: number;
  count: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tooltip" *ngIf="hoveredPoint" [ngStyle]="{'left.px': tooltipX, 'top.px': tooltipY}">
      <div class="tooltip-time">{{ hoveredPoint.displayTime }}</div>
      <div class="tooltip-value" *ngIf="hoveredPoint.powerKWh !== undefined">
        <span>Energía:</span> {{ hoveredPoint.powerKWh.toFixed(3) }} kWh
      </div>
      <div class="tooltip-value" *ngIf="hoveredPoint.tempCelsius !== undefined">
        <span>Temperatura:</span> {{ hoveredPoint.tempCelsius.toFixed(2) }}°C
      </div>
    </div>
    
    <div class="dashboard">
      <header>
        <h1>⚡ Dashboard de Monitoreo en Tiempo Real</h1>
        <div class="current-time">{{ currentTime() }}</div>
      </header>

      <!-- Sección de Valores Actuales -->
      <section class="current-values">
        <div class="value-card power">
          <div class="icon">⚡</div>
          <div class="content">
            <h3>Energía Producida</h3>
            <div class="value">{{ currentPowerKWh() }} <span>kWh</span></div>
            <div class="subtitle">Última actualización: {{ lastUpdate() }}</div>
          </div>
        </div>

        <div class="value-card temperature">
          <div class="icon">🌡️</div>
          <div class="content">
            <h3>Temperatura Media</h3>
            <div class="value">{{ currentTempCelsius() }} <span>°C</span></div>
            <div class="subtitle">Última actualización: {{ lastUpdate() }}</div>
          </div>
        </div>
      </section>

      <!-- Gráficas -->
      <section class="charts">
        <div class="chart-container">
          <h2>📊 Energía Producida (kWh) - Por Minuto</h2>
          <svg width="100%" height="300" #powerChart>
            <g transform="translate(50, 20)">
              <!-- Grid lines -->
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <line 
                  [attr.x1]="0" 
                  [attr.y1]="i * 60" 
                  [attr.x2]="chartWidth()" 
                  [attr.y2]="i * 60"
                  stroke="#e0e0e0" 
                  stroke-dasharray="5,5"
                />
              }
              
              <!-- Power line -->
              @if (minuteData().length > 1) {
                <polyline
                  [attr.points]="getPowerPoints()"
                  fill="none"
                  stroke="#ff6b6b"
                  stroke-width="2"
                />
                
                <!-- Data points -->
                @for (point of minuteData(); track point.timestamp; let i = $index) {
                  <circle
                    class="data-point"
                    [attr.cx]="getX(i)"
                    [attr.cy]="getPowerY(point.powerKWh)"
                    r="4"
                    fill="#ff6b6b"
                    (mouseenter)="showTooltip($event, point)"
                    (mouseleave)="hideTooltip()"
                  />
                }
              }
              
              <!-- Axes -->
              <line x1="0" y1="240" [attr.x2]="chartWidth()" y2="240" stroke="#333" stroke-width="2"/>
              <line x1="0" y1="0" x2="0" y2="240" stroke="#333" stroke-width="2"/>
              
              <!-- Labels -->
              @for (point of getXLabels(); track point.uniqueKey) {
                <text 
                  [attr.x]="point.x" 
                  y="260" 
                  text-anchor="middle" 
                  font-size="12"
                >
                  {{ point.displayTime }}
                </text>
              }
            </g>
          </svg>
        </div>

        <div class="chart-container">
          <h2>🌡️ Temperatura Media (°C) - Por Minuto</h2>
          <svg width="100%" height="300" #tempChart>
            <g transform="translate(50, 20)">
              <!-- Grid lines -->
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <line 
                  [attr.x1]="0" 
                  [attr.y1]="i * 60" 
                  [attr.x2]="chartWidth()" 
                  [attr.y2]="i * 60"
                  stroke="#e0e0e0" 
                  stroke-dasharray="5,5"
                />
              }
              
              <!-- Temperature line -->
              @if (minuteData().length > 1) {
                <polyline
                  [attr.points]="getTempPoints()"
                  fill="none"
                  stroke="#4ecdc4"
                  stroke-width="2"
                />
                
                <!-- Data points -->
                @for (point of minuteData(); track point.timestamp; let i = $index) {
                  <circle
                    class="data-point"
                    [attr.cx]="getX(i)"
                    [attr.cy]="getTempY(point.tempCelsius)"
                    r="4"
                    fill="#4ecdc4"
                    (mouseenter)="showTooltip($event, point)"
                    (mouseleave)="hideTooltip()"
                  />
                }
              }
              
              <!-- Axes -->
              <line x1="0" y1="240" [attr.x2]="chartWidth()" y2="240" stroke="#333" stroke-width="2"/>
              <line x1="0" y1="0" x2="0" y2="240" stroke="#333" stroke-width="2"/>
              
              <!-- Labels -->
              @for (point of getXLabels(); track point.uniqueKey) {
                <text 
                  [attr.x]="point.x" 
                  y="260" 
                  text-anchor="middle" 
                  font-size="12"
                >
                  {{ point.displayTime }}
                </text>
              }
            </g>
          </svg>
        </div>
      </section>

      <!-- Tabla de datos recientes -->
      <section class="data-table">
        <h2>📋 Últimos 10 Minutos</h2>
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Energía (kWh)</th>
              <th>Temperatura (°C)</th>
            </tr>
          </thead>
          <tbody>
            @for (data of getRecentData(); track data.uniqueKey) {
              <tr>
                <td>{{ data.displayTime }}</td>
                <td>{{ data.powerKWh.toFixed(3) }}</td>
                <td>{{ data.tempCelsius.toFixed(2) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [`
    .tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -100%);
      margin-top: -10px;
      min-width: 160px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .tooltip-time {
      font-weight: bold;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 4px;
    }
    
    .tooltip-value {
      margin: 4px 0;
    }
    
    .tooltip-value span {
      color: #ccc;
    }
    
    .data-point {
      cursor: pointer;
      transition: r 0.2s;
    }
    
    .data-point:hover {
      r: 6;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .dashboard {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    header {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    header h1 {
      color: #667eea;
      font-size: 2.5em;
    }

    .current-time {
      font-size: 1.5em;
      color: #666;
      font-weight: bold;
    }

    .current-values {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .value-card {
      background: white;
      border-radius: 15px;
      padding: 30px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s;
    }

    .value-card:hover {
      transform: translateY(-5px);
    }

    .value-card .icon {
      font-size: 4em;
    }

    .value-card .content h3 {
      color: #666;
      margin-bottom: 10px;
      font-size: 1.2em;
    }

    .value-card .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
    }

    .value-card.power .value {
      color: #ff6b6b;
    }

    .value-card.temperature .value {
      color: #4ecdc4;
    }

    .value-card .value span {
      font-size: 0.5em;
      color: #999;
    }

    .value-card .subtitle {
      color: #999;
      font-size: 0.9em;
      margin-top: 5px;
    }

    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-container {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .chart-container h2 {
      color: #667eea;
      margin-bottom: 20px;
    }

    .data-table {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .data-table h2 {
      color: #667eea;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      background: #f5f5f5;
      font-weight: bold;
      color: #667eea;
    }

    tr:hover {
      background: #f9f9f9;
    }
  `]
})
export class App implements OnInit, OnDestroy {
  hoveredPoint: any = null;
  tooltipX = 0;
  tooltipY = 0;

  showTooltip(event: MouseEvent, point: any) {
    this.hoveredPoint = point;
    this.tooltipX = event.pageX;
    this.tooltipY = event.pageY;
  }

  hideTooltip() {
    this.hoveredPoint = null;
  }
  private subscription?: Subscription;
  private yamlData: YamlData | null = null;
  
  currentTime = signal(this.formatCurrentTime());
  currentPowerKWh = signal('--');
  currentTempCelsius = signal('--');
  lastUpdate = signal('--');
  minuteData = signal<MinuteData[]>([]);

  ngOnInit() {
    console.log(' Application initialized');
    console.log(' Current time:', new Date().toLocaleTimeString());
    
    // Simular carga de datos YAML
    // En producción, usar: this.http.get('assets/data.yml')
    this.loadYamlData();
    
    // Update time every second
    this.subscription = interval(1000).subscribe(() => {
      this.currentTime.set(this.formatCurrentTime());
    });
    
    // Update data every 5 seconds
    console.log(' Setting up 5-second data update interval...');
    this.subscription.add(interval(5000).subscribe(() => {
      this.updateData();
    }));
    
    // First data update immediately
    console.log(' Triggering first data update...');
    this.updateData();
  }

  ngOnDestroy() {
    console.log(' Application destroyed - cleaning up subscription');
    this.subscription?.unsubscribe();
  }

  private loadYamlData() {
    console.log(' Starting YAML data load...');
    
    // Simular datos del YAML para 24 horas
    const powerValues: DataPoint[] = [];
    const tempValues: DataPoint[] = [];
    
    for (let i = 0; i < 17280; i++) { // 24h * 60min * 12 (cada 5 seg)
      const seconds = i * 5;
      const time = this.formatTimeFromSeconds(seconds);
      
      powerValues.push({
        time,
        value: 54.5 + Math.random() * 1.5
      });
      
      tempValues.push({
        time,
        value: 2920 + Math.random() * 10
      });
    }
    
    this.yamlData = {
      power: { unit: 'MW', values: powerValues },
      temperature: { unit: 'dK', values: tempValues }
    };
    
    console.log(' YAML data loaded successfully');
    console.log(' Total power data points:', powerValues.length);
    console.log(' Total temperature data points:', tempValues.length);
    console.log(' Time range:', powerValues[0].time, 'to', powerValues[powerValues.length - 1].time);
    console.log('─────────────────────────────────');
  }

  private updateData() {
    if (!this.yamlData) {
      console.warn(' No YAML data loaded yet');
      return;
    }
    
    const now = new Date();
    // Time is now updated by the 1-second interval, no need to update it here
    
    // Calcular índice basado en la hora actual
    const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const index = Math.floor(secondsToday / 5);
    
    console.log(' UPDATE TRIGGERED');
    console.log(' Current time:', now.toLocaleTimeString());
    console.log(' Seconds today:', secondsToday);
    console.log(' Data index:', index);
    console.log('⏰ Current time:', now.toLocaleTimeString());
    console.log('📊 Seconds today:', secondsToday);
    console.log('📍 Data index:', index);
    
    if (index < this.yamlData.power.values.length) {
      const powerMW = this.yamlData.power.values[index].value;
      const tempDK = this.yamlData.temperature.values[index].value;
      const dataTime = this.yamlData.power.values[index].time;
      
      console.log('📈 Raw data from YAML:',this.minuteData());
      console.log('  - Time from file:', dataTime);
      console.log('  - Power (MW):', powerMW);
      console.log('  - Temperature (dK):', tempDK);
      
      // Convertir MW a kWh (para 5 segundos)
      const powerKWh = powerMW * 1000 * (5 / 3600);
      
      // Convertir dK a °C
      const tempCelsius = tempDK / 10 - 273.15;
      
      console.log('🔄 Converted values:');
      console.log('  - Power (kWh):', powerKWh.toFixed(2));
      console.log('  - Temperature (°C):', tempCelsius.toFixed(2));
      
      this.currentPowerKWh.set(powerKWh.toFixed(2));
      this.currentTempCelsius.set(tempCelsius.toFixed(2));
      this.lastUpdate.set(now.toLocaleTimeString());
      
      // Actualizar datos por minuto
      this.updateMinuteData(now, powerKWh, tempCelsius);
      
      console.log('✅ Data updated successfully');
      console.log('📊 Total minute data points:', this.minuteData().length);
      console.log('─────────────────────────────────');
    } else {
      console.error('❌ Index out of bounds:', index, '>=', this.yamlData.power.values.length);
    }
  }

  private updateMinuteData(time: Date, powerKWh: number, tempCelsius: number) {
    // Store the full timestamp for unique identification
    const timestamp = time.getTime();
    // Format for display
    const displayTime = time.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
    
    const current = this.minuteData();
    
    // Add new data point (keep last 120 points - 10 minutes of 5-second intervals)
    const newData = [...current, {
      timestamp,
      displayTime,
      powerKWh,
      tempCelsius,
      count: 1
    }].slice(-120); // Keep last 10 minutes of 5-second data points
    
    this.minuteData.set(newData);
    console.log('➕ Added new data point:', displayTime);
  }

  private formatCurrentTime(): string {
    return new Date().toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private formatTimeFromSeconds(seconds: number): string {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Métodos para las gráficas
  chartWidth(): number {
    return 800;
  }

  getX(index: number): number {
    const data = this.minuteData();
    if (data.length <= 1) return 0;
    return (index / (data.length - 1)) * this.chartWidth();
  }

  getPowerY(value: number): number {
    const data = this.minuteData();
    const values = data.map(d => d.powerKWh);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return 240 - ((value - min) / range) * 220;
  }

  getTempY(value: number): number {
    const data = this.minuteData();
    const values = data.map(d => d.tempCelsius);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return 240 - ((value - min) / range) * 220;
  }

  getPowerPoints(): string {
    return this.minuteData()
      .map((d, i) => `${this.getX(i)},${this.getPowerY(d.powerKWh)}`)
      .join(' ');
  }

  getTempPoints(): string {
    return this.minuteData()
      .map((d, i) => `${this.getX(i)},${this.getTempY(d.tempCelsius)}`)
      .join(' ');
  }

  getXLabels(): Array<{x: number, displayTime: string, uniqueKey: string}> {
    const data = this.minuteData();
    if (data.length === 0) return [];
    
    // Show fewer labels to avoid clutter
    const step = Math.max(1, Math.floor(data.length / 5));
    return data
      .filter((_, i) => i % step === 0)
      .map((d, i) => ({
        x: this.getX(i * step),
        displayTime: d.displayTime.split(':').slice(0, 2).join(':'), // Display only hours and minutes
        uniqueKey: `label_${d.timestamp}` // Use timestamp as unique key
      }));
  }

  getRecentData(): Array<MinuteData & { uniqueKey: string }> {
    // Show last 12 data points (1 minute of data at 5-second intervals)
    return this.minuteData()
      .slice(-12)
      .reverse()
      .map(d => ({
        ...d,
        uniqueKey: `data_${d.timestamp}`, // Use timestamp as unique key
        // Format time for display (HH:MM:SS)
        displayTime: d.displayTime
      }));
  }
}