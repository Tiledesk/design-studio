export class TiledeskStage {

    tx = 0;
    ty = 0;
    scale = 1;
    scaleStep = 0.2;
    torigin = `0 0`;
  
    containerId;
    drawerId;
    container;
    drawer;
  
    classDraggable = "tds_draggable";
    isDragging = false;
  
    position = { x: 0, y: 0 };
  
    /* Step 1 – batching */
    _pendingMovedScaled = null;
    _movedScaledRafId = null;
  
    /* Step 2 – transform coherence */
    transformDirty = false;
  
    constructor(containerId, drawerId, classDraggable) {
      this.containerId = containerId;
      this.drawerId = drawerId;
      this.classDraggable = classDraggable;
  
      this.moveAndZoom = this.moveAndZoom.bind(this);
    }
  
    setDrawer() {
      this.container = document.getElementById(this.containerId);
      this.drawer = document.getElementById(this.drawerId);
  
      this.drawer.style.transformOrigin = this.torigin;
  
      this.container.addEventListener("wheel", this.moveAndZoom);
      this.setupMouseDrag();
    }
  
    setupMouseDrag() {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let clientX = 0;
      let clientY = 0;
  
      this.container.onmousedown = (function (event) {
  
        if (event.button === 1) {
          isDragging = true;
          event.preventDefault();
  
          clientX = event.clientX;
          clientY = event.clientY;
  
          this.getPositionNow();
          startX = this.tx;
          startY = this.ty;
  
          document.onmousemove = (function (event) {
            if (!isDragging) return;
  
            this.tx = startX + (event.clientX - clientX);
            this.ty = startY + (event.clientY - clientY);
  
            this.transform();
            this.scheduleMovedAndScaled();
  
          }).bind(this);
  
          document.onmouseup = (function () {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
          }).bind(this);
        }
  
      }).bind(this);
    }
  
    moveAndZoom(event) {
      event.preventDefault();
  
      const dx = event.deltaX;
      const dy = event.deltaY;
  
      this.getPositionNow();
  
      if (!event.ctrlKey) {
  
        this.tx -= dx;
        this.ty -= dy;
  
        this.transform();
  
      } else {
  
        const zoomPoint = {
          x: event.offsetX,
          y: event.offsetY
        };
  
        const zoomTarget = {
          x: (zoomPoint.x - this.tx) / this.scale,
          y: (zoomPoint.y - this.ty) / this.scale
        };
  
        this.scale += dy * -0.01;
        this.scale = Math.min(Math.max(0.125, this.scale), 4);
  
        this.tx = -zoomTarget.x * this.scale + zoomPoint.x;
        this.ty = -zoomTarget.y * this.scale + zoomPoint.y;
  
        this.transform();
      }
  
      this.scheduleMovedAndScaled();
    }
  
    transform() {
      const tcmd = `translate3d(${this.tx}px, ${this.ty}px, 0)`;
      const scmd = `scale(${this.scale})`;
  
      this.drawer.style.transform = `${tcmd} ${scmd}`;
  
      this.transformDirty = false;
    }
  
    /* Step 2 – guarded */
    getPositionNow() {
  
      if (!this.transformDirty) return;
  
      const computedStyle = window.getComputedStyle(this.drawer);
      const transformValue = computedStyle.getPropertyValue("transform");
  
      if (transformValue && transformValue !== "none") {
  
        const matrix = transformValue.match(/matrix.*\((.+)\)/)[1].split(", ");
  
        this.tx = parseFloat(matrix[4]);
        this.ty = parseFloat(matrix[5]);
        this.scale = parseFloat(matrix[0]);
      }
  
      this.transformDirty = false;
    }
  
    scheduleMovedAndScaled() {
      this._pendingMovedScaled = {
        scale: this.scale,
        x: this.tx,
        y: this.ty
      };
  
      if (this._movedScaledRafId !== null) return;
  
      this._movedScaledRafId = requestAnimationFrame(() => {
        this._movedScaledRafId = null;
  
        if (!this._pendingMovedScaled) return;
  
        document.dispatchEvent(new CustomEvent("moved-and-scaled", {
          detail: this._pendingMovedScaled
        }));
  
        this._pendingMovedScaled = null;
      });
    }
  
    translateAndScale(pos, scale = 1) {
  
      this.scale = scale;
  
      const originRec = this.container.getBoundingClientRect();
  
      const newX = originRec.width / 2 - pos.x;
      const newY = originRec.height / 2 - pos.y;
  
      const tcmd = `translate(${newX}px, ${newY}px)`;
      const scmd = `scale(${scale})`;
  
      this.drawer.style.transform = `${tcmd} ${scmd}`;
  
      this.tx = newX;
      this.ty = newY;
  
      this.transformDirty = true;
  
      return true;
    }
  
    centerStageOnElement(stageElement, scale = 1) {
  
      const w = stageElement.offsetWidth * scale;
      const h = stageElement.offsetHeight * scale;
      const x = stageElement.offsetLeft * scale;
      const y = stageElement.offsetTop * scale;
  
      const pos = {
        x: x + w / 2,
        y: y + h / 2
      };
  
      return this.translateAndScale(pos, scale);
    }
  }
  