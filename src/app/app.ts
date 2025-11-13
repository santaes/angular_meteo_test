import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import * as yaml from 'js-yaml';

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
        <div class="table-header">
          <h2>📋 Historial de Datos</h2>
          <div class="page-size-selector">
            <span>Mostrar:</span>
            <select id="itemsPerPage" name="itemsPerPage" (change)="changePageSize($any($event.target).value)" [value]="itemsPerPage">
              @for (size of pageSizes; track size) {
                <option [value]="size">{{ size }} por página</option>
              }
            </select>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="time-header">Hora</th>
                <th class="number-header">Energía (kWh)</th>
                <th class="number-header">Temperatura (°C)</th>
              </tr>
            </thead>
            <tbody>
              @for (data of paginatedData; track data.uniqueKey) {
                <tr>
                  <td class="time-cell">{{ data.displayTime }}</td>
                  <td class="number-cell">{{ data.powerKWh.toFixed(2) }}</td>
                  <td class="number-cell">{{ data.tempCelsius.toFixed(2) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <div class="pagination-controls">
          <button 
            (click)="changePage(1)" 
            [disabled]="currentPage === 1"
            [class.disabled]="currentPage === 1">
            &laquo;
          </button>
          <button 
            (click)="changePage(currentPage - 1)" 
            [disabled]="currentPage === 1"
            [class.disabled]="currentPage === 1">
            &lsaquo;
          </button>
          
          @for (page of getPageNumbers(); track page) {
            @if (page === '...') {
              <span class="ellipsis">...</span>
            } @else {
              <button 
                (click)="changePage(+page)" 
                [class.active]="page === currentPage">
                {{ page }}
              </button>
            }
          }
          
          <button 
            (click)="changePage(currentPage + 1)" 
            [disabled]="currentPage === totalPages"
            [class.disabled]="currentPage === totalPages">
            &rsaquo;
          </button>
          <button 
            (click)="changePage(totalPages)" 
            [disabled]="currentPage === totalPages"
            [class.disabled]="currentPage === totalPages">
            &raquo;
          </button>
          
          <span class="page-info">
            Página {{ currentPage }} de {{ totalPages }} ({{ minuteData().length }} registros)
          </span>
        </div>
      </section>
    </div>
  `,
  styles: [`
    /* Pagination styles */
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .page-size-selector select {
      padding: 0.4rem 0.8rem;
      border-radius: 4px;
      border: 1px solid #ddd;
      background: white;
      font-size: 0.9rem;
    }
    
    .table-container {
      overflow-x: auto;
      margin: 1rem 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      padding: 1rem;
    }
    
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.95rem;
    }
    
    th, td {
      padding: 0.75rem 1rem;
      text-align: center;
      border-bottom: 1px solid #eee;
    }
    
    th {
      background-color: #f8f9fa;
      color: #495057;
      text-align: center;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    
    .number-header {
      text-align: right !important;
    }
    
    .time-header {
      text-align: left !important;
    }
    
    td {
      color: #2c3e50;
      vertical-align: middle;
    }
    
    tr:not(:last-child) td {
      border-bottom: 1px solid #f1f3f5;
    }
    
    tr:hover td {
      background-color: #f8f9fa;
    }
    
    .number-cell {
      font-family: 'Roboto Mono', 'Courier New', monospace;
      text-align: center;
      color: #2c3e50;
      font-weight: 500;
    }
    
    .time-cell {
      color: #495057;
      font-weight: 500;
      white-space: nowrap;
    }
    
    @media (max-width: 768px) {
      .table-container {
        padding: 0.5rem;
      }
      
      th, td {
        padding: 0.6rem 0.5rem;
        font-size: 0.85rem;
      }
      
      th {
        font-size: 0.75rem;
      }
    }
    
    .pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    
    .pagination-controls button {
      padding: 0.5rem 0.8rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .pagination-controls button:hover:not(:disabled) {
      background: #f0f0f0;
    }
    
    .pagination-controls button.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .pagination-controls button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pagination-controls button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .page-info {
      margin-left: 1rem;
      font-size: 0.9rem;
      color: #666;
    }
    
    
    @media (max-width: 768px) {
      .table-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .pagination-controls {
        gap: 0.3rem;
      }
      
      .pagination-controls button {
        padding: 0.3rem 0.6rem;
      }
      
      .page-info {
        display: block;
        width: 100%;
        text-align: center;
        margin: 0.5rem 0 0;
      }
    }
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
      justify-content: center;
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
      justify-content: center;
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
  private subscription: Subscription | null = null;
  private yamlData: YamlData = { power: { unit: '', values: [] }, temperature: { unit: '', values: [] } };
  private http = inject(HttpClient);
  currentTime = signal(this.formatCurrentTime());
  currentPowerKWh = signal('--');
  currentTempCelsius = signal('--');
  lastUpdate = signal('--');
  minuteData = signal<MinuteData[]>([]);

  ngOnInit() {
/*     console.log(' Application initialized');
    console.log(' Current time:', new Date().toLocaleTimeString()); */
    
    // Simular carga de datos YAML
    // En producción, usar: this.http.get('assets/data.yml')
    this.loadYamlData();
    
    // Update time every second
    this.subscription = interval(1000).subscribe(() => {
      this.currentTime.set(this.formatCurrentTime());
    });
    
    // Update data every 5 seconds
   // console.log(' Setting up 5-second data update interval...');
    this.subscription.add(interval(5000).subscribe(() => {
      this.updateData();
    }));
    
    // First data update immediately
   // console.log(' Triggering first data update...');
    this.updateData();
  }

  ngOnDestroy() {
   // console.log(' Application destroyed - cleaning up subscription');
    this.subscription?.unsubscribe();
  }

  private loadYamlData() {
   // console.log('⏳ Loading YAML data...');
    
    // First, try to load the file as text
    this.http.get('/data.yml', { responseType: 'text' }).subscribe({
      next: (yamlString) => {
        try {
          //console.log('📄 Raw YAML content (first 200 chars):', yamlString.substring(0, 200) + '...');
          
          // Parse YAML string to JavaScript object
          const parsedData = yaml.load(yamlString) as any;
          //console.log('✅ Successfully parsed YAML data');
          
          // Log the structure of the parsed data for debugging
  /*           console.log('🔍 Parsed YAML structure:', {
              hasPower: !!parsedData.power,
              hasTemperature: !!parsedData.temperature, 
              powerKeys: parsedData.power ? Object.keys(parsedData.power) : [],
              tempKeys: parsedData.temperature ? Object.keys(parsedData.temperature) : []
            }); */
          
          // First, process both datasets independently
          const powerData = (parsedData.power?.values || []).map((item: any) => {
            const value = typeof item.value === 'string' ? 
              parseFloat(item.value) : 
              (typeof item.value === 'number' ? item.value : 0);
            
            if (isNaN(value)) {
              console.warn('⚠️ Invalid power value:', item.value);
              return null;
            }
            
            return {
              time: item.time || '00:00:00',
              value: value
            };
          }).filter((item: any) => item !== null);

          const temperatureData = (parsedData.temperature?.values || []).map((item: any) => {
            const value = typeof item.value === 'string' ? 
              parseFloat(item.value) : 
              (typeof item.value === 'number' ? item.value : 0);
            
            if (isNaN(value)) {
              console.warn('⚠️ Invalid temperature value:', item.value);
              return null;
            }
            
            return {
              time: item.time || '00:00:00',
              value: value
            };
          }).filter((item: any) => item !== null);

          // Find the minimum length between the two datasets
          const minLength = Math.min(powerData.length, temperatureData.length);
          
          //console.log(`📊 Found ${powerData.length} power values and ${temperatureData.length} temperature values`);
          //console.log(`📏 Using first ${minLength} data points from each`);
          
          // Create the result with matching data points
          const result: YamlData = {
            power: {
              unit: parsedData.power?.unit || 'MW',
              values: powerData.slice(0, minLength)
            },
            temperature: {
              unit: parsedData.temperature?.unit || 'dK',
              values: temperatureData.slice(0, minLength)
            }
          };
          
          //console.log(`📊 Loaded ${result.power.values.length} power values and ${result.temperature.values.length} temperature values`);
          
          if (result.power.values.length > 0 && result.temperature.values.length > 0) {
            this.yamlData = result;
            // Add a small delay to ensure the UI updates
            setTimeout(() => this.updateData(), 100);
          } else {
            throw new Error('No valid data points found in YAML');
          }
        } catch (error) {
          console.error('❌ Error processing YAML data:', error);
          console.warn('Falling back to simulated data');
          this.loadSimulatedData();
        }
      },
      error: (error) => {
        console.error('❌ Failed to load YAML file:', error);
        console.warn('Falling back to simulated data');
        this.loadSimulatedData();
      }
    });
  }

  private loadSimulatedData() {
    // Fallback data generation if YAML loading fails
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
    
    // Initialize with the first data point
    this.updateData();
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: (number | string)[] = [];
    
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    
    if (current - delta > 2) {
      range.unshift('...');
    }
    if (current + delta < total - 1) {
      range.push('...');
    }
    
    range.unshift(1);
    if (total > 1) range.push(total);
    
    return range;
  }

  private updateData() {
    try {
      // Check if we have valid data
      if (!this.yamlData?.power?.values?.length || !this.yamlData?.temperature?.values?.length) {
        return;
      }
      
      const now = new Date();
      const secondsToday = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
      
      // Get the minimum length between power and temperature data
      const dataLength = Math.min(
        this.yamlData.power.values.length,
        this.yamlData.temperature.values.length
      );
      
      if (dataLength === 0) {
        console.error('❌ No valid data points available');
        return;
      }
      
      // Calculate the index based on current time (data points every 5 seconds)
      // Ensure the index is within the valid range [0, dataLength - 1]
      const index = Math.min(
        Math.max(0, Math.floor(secondsToday / 5)),
        dataLength - 1
      );
      
      //console.log('⏰ Current time:', now.toLocaleTimeString());
      //console.log('📊 Seconds today:', secondsToday);
      //console.log('📏 Total data points available:', dataLength);
      //console.log('📍 Data index:', index, 'of', dataLength - 1);
      
      // Get the data points
      const powerData = this.yamlData.power.values[index];
      const tempData = this.yamlData.temperature.values[index];
      
      if (!powerData || !tempData) {
        throw new Error(`Missing data at index ${index}`);
      }
      
      // Process the data
      const powerMW = powerData.value;
      const tempDK = tempData.value;
      const dataTime = powerData.time;
      
      // Convert MW to kWh (for 5 seconds)
      const powerKWh = powerMW * 1000 * (5 / 3600);
      
      // Convert dK to °C (dK = deciKelvin = 0.1 Kelvin)
      const tempCelsius = (tempDK / 10) - 273.15;
      
      //console.log('📈 Raw data from YAML:');
      //console.log('  - Time from file:', dataTime);
      //console.log('  - Power (MW):', powerMW);
      //console.log('  - Temperature (dK):', tempDK);
      //console.log('  - Power (kWh):', powerKWh.toFixed(2));
      //console.log('  - Temperature (°C):', tempCelsius.toFixed(2));
      
      // Update current values
      this.currentPowerKWh.set(powerKWh.toFixed(2));
      this.currentTempCelsius.set(tempCelsius.toFixed(2));
      this.lastUpdate.set(now.toLocaleTimeString());
      
      // Update the minute data
      this.updateMinuteData({
        timestamp: now.getTime(),
        displayTime: now.toLocaleTimeString(),
        powerKWh: powerKWh,
        tempCelsius: tempCelsius,
        count: 1
      });
      
      //console.log('✅ Data updated successfully');
      //console.log('📊 Total minute data points:', this.minuteData().length);
      //console.log('─────────────────────────────────');
      
    } catch (error) {
      console.error('❌ Error in updateData:', error);
      console.warn('⚠️ Falling back to simulated data');
      this.loadSimulatedData();
    }
  }

  private updateMinuteData(data: {timestamp: number, displayTime: string, powerKWh: number, tempCelsius: number, count: number}) {
    const current = this.minuteData();
    
    // Add new data point (keep last 120 points - 10 minutes of 5-second intervals)
    const newData = [...current, data].slice(-120); // Keep last 10 minutes of 5-second data points
    
    this.minuteData.set(newData);
/*     console.log('➕ Added new data point:', displayTime); */
  }

  currentPage = 1;
  itemsPerPage = 5;
  pageSizes = [5, 10, 20, 50];

  get totalPages(): number {
    return Math.ceil(this.minuteData().length / this.itemsPerPage);
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.getRecentData().slice(start, start + this.itemsPerPage);
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  changePageSize(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset to first page when changing page size
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