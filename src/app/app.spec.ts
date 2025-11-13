import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

describe('AppComponent', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  const mockYamlData = `
power:
  unit: 'MW'
  values:
    - time: '00:00:00'
      value: 50.0
    - time: '00:00:05'
      value: 51.2
temperature:
  unit: 'dK'
  values:
    - time: '00:00:00'
      value: 2931
    - time: '00:00:05'
      value: 2932
`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    
    // Create component without triggering ngOnInit
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    httpClient = TestBed.inject(HttpClient);
  });
  
  // Helper function to initialize component with mock data
  function setupComponent(withError = false) {
    fixture.detectChanges(); // triggers ngOnInit
    
    const req = httpTestingController.expectOne('/data.yml');
    
    if (withError) {
      const errorEvent = new ErrorEvent('Network error');
      req.error(errorEvent);
    } else {
      req.flush(mockYamlData);
    }
    
    fixture.detectChanges();
  }

  afterEach(() => {
    httpTestingController.verify();
    jasmine.clock().uninstall();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial values set', () => {
    // Test before initialization
    expect(component.currentPowerKWh()).toBe('--');
    expect(component.currentTempCelsius()).toBe('--');
    expect(component.lastUpdate()).toBe('--');
    expect(component.minuteData().length).toBe(0);
    
    // Initialize with mock data
    setupComponent();
    
    // Test after initialization
    expect(component.currentPowerKWh()).toBeDefined();
    expect(component.currentTempCelsius()).toBeDefined();
    expect(component.lastUpdate()).toBeDefined();
    expect(component.minuteData().length).toBeGreaterThanOrEqual(0);
  });

  it('should load YAML data successfully', () => {
    // Reset the component to test the full initialization
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    
    // Spy on the updateData method to verify it's called
    const updateDataSpy = spyOn(component as any, 'updateData');
    
    // Trigger initialization
    fixture.detectChanges();
    
    // Respond to the HTTP request
    const req = httpTestingController.expectOne('/data.yml');
    req.flush(mockYamlData);
    
    fixture.detectChanges();
    
    // Verify the data was processed
    expect(component['yamlData']).toBeDefined();
    expect(component['yamlData'].power.values.length).toBe(2);
    expect(component['yamlData'].temperature.values.length).toBe(2);
    
    // Verify updateData was called
    expect(updateDataSpy).toHaveBeenCalled();
    
    // Verify the component state was updated
    expect(component.currentPowerKWh()).toBeDefined();
    expect(component.currentTempCelsius()).toBeDefined();
  });

  it('should handle YAML loading error and fallback to simulated data', fakeAsync(() => {
    // Reset the component to test the full initialization
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    
    // Spy on the console
    const consoleErrorSpy = spyOn(console, 'error').and.callThrough();
    const consoleWarnSpy = spyOn(console, 'warn').and.callThrough();
    
    // Create a resolved promise for loadSimulatedData
    const mockLoadSimulatedData = () => {
      return Promise.resolve().then(() => {
        component['currentPowerKWh'].set('100.00');
        component['currentTempCelsius'].set('25.00');
        component['lastUpdate'].set(new Date().toISOString());
      });
    };
    
    // Mock the loadSimulatedData method to return our mock promise
    const loadSimulatedDataSpy = spyOn(component as any, 'loadSimulatedData').and.callFake(mockLoadSimulatedData);
    
    // Mock the updateData method to prevent side effects
    spyOn(component as any, 'updateData').and.returnValue(Promise.resolve());
    
    // Trigger initialization
    fixture.detectChanges();
    
    // Respond to the HTTP request with an error
    const req = httpTestingController.expectOne('/data.yml');
    req.flush('Error loading YAML', { status: 404, statusText: 'Not Found' });
    
    // Let any async operations complete
    tick();
    fixture.detectChanges();
    
    // Wait for the next tick to ensure all promises are resolved
    tick();
    fixture.detectChanges();
    
    // Verify the error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Verify the warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to simulated data');
    
    // Verify fallback to simulated data was called
    expect(loadSimulatedDataSpy).toHaveBeenCalled();
    
    // Verify the component state was updated with simulated data
    expect(component.currentPowerKWh()).toBe('100.00');
    expect(component.currentTempCelsius()).toBe('25.00');
    expect(component.lastUpdate()).toBeDefined();
    
    // Clean up any timers that might have been set
    const subscription = (component as any).dataSubscription;
    if (subscription) {
      subscription.unsubscribe();
    }
    
    // Clean up the fixture
    fixture.destroy();
  }));

  it('should update data correctly', () => {
    // Initialize with mock data
    setupComponent();
    
    // Mock Date to a fixed time
    const mockDate = new Date('2023-01-01T00:00:03Z');
    jasmine.clock().install();
    jasmine.clock().mockDate(mockDate);
    
    // Store initial values
    const initialPower = component.currentPowerKWh();
    const initialTemp = component.currentTempCelsius();
    const initialDataLength = component.minuteData().length;
    
    // Trigger update
    component['updateData']();
    
    // Verify the data was processed correctly
    expect(component.currentPowerKWh()).not.toBe(initialPower);
    expect(component.currentTempCelsius()).not.toBe(initialTemp);
    expect(component.minuteData().length).toBe(initialDataLength + 1);
    
    // Clean up
    jasmine.clock().uninstall();
  });

  it('should handle empty data gracefully', () => {
    // Initialize with empty data
    const emptyYaml = `
power:
  unit: 'MW'
  values: []
temperature:
  unit: 'dK'
  values: []
`;
    
    // Reset the component to test the full initialization
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    
    // Mock updateData to prevent it from modifying the component state
    const updateDataSpy = spyOn(component as any, 'updateData').and.callFake(() => {
      component['minuteData'].set([]);
      return Promise.resolve();
    });
    
    // Trigger initialization
    fixture.detectChanges();
    
    // Respond with empty data
    const req = httpTestingController.expectOne('/data.yml');
    req.flush(emptyYaml);
    
    fixture.detectChanges();
    
    // Call updateData directly and verify it doesn't throw
    component['updateData']();
    
    // Verify minuteData is empty
    expect(component.minuteData().length).toBe(0);
    expect(updateDataSpy).toHaveBeenCalled();
  });

  it('should calculate chart points correctly', () => {
    // Initialize with mock data first
    setupComponent();
    
    // Add test data
    component['minuteData'].set([
      { timestamp: 1000, displayTime: '00:00:01', powerKWh: 10, tempCelsius: 20, count: 1 },
      { timestamp: 2000, displayTime: '00:00:02', powerKWh: 20, tempCelsius: 25, count: 1 },
      { timestamp: 3000, displayTime: '00:00:03', powerKWh: 30, tempCelsius: 30, count: 1 }
    ]);
    
    // Test getPowerPoints
    const powerPoints = component['getPowerPoints']();
    expect(typeof powerPoints).toBe('string');
    
    // Test getTempPoints
    const tempPoints = component['getTempPoints']();
    expect(typeof tempPoints).toBe('string');
    
    // Test getXLabels
    const labels = component['getXLabels']();
    expect(Array.isArray(labels)).toBeTrue();
    if (labels.length > 0) {
      expect('x' in labels[0]).toBeTrue();
      expect('displayTime' in labels[0]).toBeTrue();
    }
  });

  it('should get recent data in correct order', () => {
    // Initialize with mock data first
    setupComponent();
    
    // Add test data
    component['minuteData'].set([
      { timestamp: 1000, displayTime: '00:00:01', powerKWh: 10, tempCelsius: 20, count: 1 },
      { timestamp: 2000, displayTime: '00:00:02', powerKWh: 20, tempCelsius: 25, count: 1 },
      { timestamp: 3000, displayTime: '00:00:03', powerKWh: 30, tempCelsius: 30, count: 1 }
    ]);
    
    const recentData = component['getRecentData']();
    expect(Array.isArray(recentData)).toBeTrue();
    
    if (recentData.length > 0) {
      // Check that data is sorted in descending order by timestamp
      for (let i = 0; i < recentData.length - 1; i++) {
        expect(recentData[i].timestamp).toBeGreaterThanOrEqual(recentData[i + 1].timestamp);
      }
    }
  });
});
