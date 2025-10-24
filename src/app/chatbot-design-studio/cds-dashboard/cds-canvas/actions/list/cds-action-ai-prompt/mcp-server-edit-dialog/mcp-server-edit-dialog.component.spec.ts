import { ComponentFixture, TestBed } from '@angular/core/testing';

import { McpServerEditDialogComponent } from './mcp-server-edit-dialog.component';

describe('McpServerEditDialogComponent', () => {
  let component: McpServerEditDialogComponent;
  let fixture: ComponentFixture<McpServerEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ McpServerEditDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(McpServerEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

