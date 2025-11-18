import { ComponentFixture, TestBed } from '@angular/core/testing';

import { McpServersDialogComponent } from './mcp-servers-dialog.component';

describe('McpServersDialogComponent', () => {
  let component: McpServersDialogComponent;
  let fixture: ComponentFixture<McpServersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ McpServersDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(McpServersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

