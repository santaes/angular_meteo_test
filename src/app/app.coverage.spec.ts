import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import * as yaml from 'js-yaml';

// Mock the yaml module
class YamlMock {
  static load(yamlString: string) {
    // Simple mock implementation for testing
    if (yamlString.includes('invalid')) {
      throw new Error('Invalid YAML');
    }
    return {
      power: {
        unit: 'MW',
        values: [
          { time: '00:00:00', value: '50.0' },
          { time: '00:00:05', value: '51.2' }
        ]
      },
      temperature: {
        unit: 'dK',
        values: [
          { time: '00:00:00', value: '2931' },
          { time: '00:00:05', value: '2932' }
        ]
      }
    };
  }
}

// Spy on the yaml module
const yamlLoadSpy = spyOn(yaml, 'load').and.callFake(YamlMock.load);

describe('AppComponent - Additional Coverage', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [App]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should handle YAML parsing error', fakeAsync(() => {
    const consoleErrorSpy = spyOn(console, 'error').and.callFake(() => {});
    const consoleWarnSpy = spyOn(console, 'warn').and.callFake(() => {});
    
    // Trigger YAML loading
    component['loadYamlData']();
    
    // Mock the HTTP response with invalid YAML
    const req = httpTestingController.expectOne('/data.yml');
    req.flush('invalid yaml content');
    
    // Let async operations complete
    tick();
    
    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error processing YAML data:', jasmine.any(Error));
    expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to simulated data');
    
    // Clean up
    consoleErrorSpy.and.callThrough();
    consoleWarnSpy.and.callThrough();
  }));

  it('should handle empty YAML data', fakeAsync(() => {
    const consoleWarnSpy = spyOn(console, 'warn').and.callFake(() => {});
    
    // Trigger YAML loading
    component['loadYamlData']();
    
    // Mock the HTTP response with empty data
    const req = httpTestingController.expectOne('/data.yml');
    req.flush('power: { values: [] }\ntemperature: { values: [] }');
    
    // Let async operations complete
    tick();
    
    // Verify error handling
    expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to simulated data');
    
    // Clean up
    consoleWarnSpy.and.callThrough();
  }));

  it('should handle HTTP error when loading YAML', fakeAsync(() => {
    const consoleErrorSpy = spyOn(console, 'error').and.callFake(() => {});
    const consoleWarnSpy = spyOn(console, 'warn').and.callFake(() => {});
    
    // Trigger YAML loading
    component['loadYamlData']();
    
    // Simulate HTTP error
    const req = httpTestingController.expectOne('/data.yml');
    req.error(new ErrorEvent('Network error'));
    
    // Let async operations complete
    tick();
    
    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to simulated data');
    
    // Clean up
    consoleErrorSpy.and.callThrough();
    consoleWarnSpy.and.callThrough();
  }));

  it('should handle invalid power values', fakeAsync(() => {
    // Mock the YAML loader to return invalid power values
    yamlLoadSpy.and.returnValue({
      power: {
        unit: 'MW',
        values: [
          { time: '00:00:00', value: 'invalid' },
          { time: '00:00:05', value: '51.2' }
        ]
      },
      temperature: {
        unit: 'dK',
        values: [
          { time: '00:00:00', value: '2931' },
          { time: '00:00:05', value: '2932' }
        ]
      }
    });
    
    const consoleWarnSpy = spyOn(console, 'warn').and.callFake(() => {});
    
    // Trigger YAML loading
    component['loadYamlData']();
    
    // Mock the HTTP response
    const req = httpTestingController.expectOne('/data.yml');
    req.flush('mocked yaml content');
    
    // Let async operations complete
    tick();
    
    // Verify warning was logged for invalid value
    expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Invalid power value:', 'invalid');
    
    // Clean up
    consoleWarnSpy.and.callThrough();
  }));

  it('should handle invalid temperature values', fakeAsync(() => {
    // Mock the YAML loader to return invalid temperature values
    yamlLoadSpy.and.returnValue({
      power: {
        unit: 'MW',
        values: [
          { time: '00:00:00', value: '50.0' },
          { time: '00:00:05', value: '51.2' }
        ]
      },
      temperature: {
        unit: 'dK',
        values: [
          { time: '00:00:00', value: 'invalid' },
          { time: '00:00:05', value: '2932' }
        ]
      }
    });
    
    const consoleWarnSpy = spyOn(console, 'warn').and.callFake(() => {});
    
    // Trigger YAML loading
    component['loadYamlData']();
    
    // Mock the HTTP response
    const req = httpTestingController.expectOne('/data.yml');
    req.flush('mocked yaml content');
    
    // Let async operations complete
    tick();
    
    // Verify warning was logged for invalid value
    expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Invalid temperature value:', 'invalid');
    
    // Clean up
    consoleWarnSpy.and.callThrough();
  }));
});
