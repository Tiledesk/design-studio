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
    position = {x: 0, y: 0};
    // isDraggingElement = false;
    // isDraggingElement = false;

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
        var isDragging = false;
        var startX = 0;
        var startY = 0;
        var clientX = 0;
        var clientY = 0;
        this.container.onmousedown = (function(event) {
            if (event.button === 1) { 
                // Bottone centrale del mouse (rotellina)
                isDragging = true;
                event.preventDefault();
                clientX = event.clientX;
                clientY = event.clientY;
                this.getPositionNow();
                startX = this.tx;
                startY = this.ty;
                document.onmousemove = (function(event) {
                    if (isDragging) {
                        let direction = 1;
                        this.tx = startX + (event.clientX - clientX) * direction;
                        this.ty = startY + (event.clientY - clientY) * direction;
                        this.transform();
                        setTimeout(() => {
                            const customEvent = new CustomEvent("moved-and-scaled", { detail: {scale: this.scale, x: this.tx, y: this.ty} });
                            document.dispatchEvent(customEvent);
                        }, 0)
                    }
                }).bind(this);

                document.onmouseup = (function() {
                    isDragging = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                }).bind(this);
            }

        }).bind(this);
    }



    moveAndZoom(event) {
        // console.log("[TILEDESK-STAGE-JS]  •••• moveAndZoom ••••");
        event.preventDefault();
        const dx = event.deltaX;
        const dy = event.deltaY;
        this.getPositionNow();

        if (event.ctrlKey === false) {
            let direction = -1;
            this.tx += event.deltaX * direction;
            this.ty += event.deltaY * direction;
            this.transform();
        } else {
            let originRec = this.container.getBoundingClientRect();            
            // zoom
            let zoom_target = {x:0,y:0}
            let zoom_point = {x:0,y:0}
            zoom_point.x = event.pageX - this.drawer.offsetLeft-originRec.x;
            zoom_point.y = event.pageY - this.drawer.offsetTop-originRec.y;
            zoom_target.x = (zoom_point.x - this.tx)/this.scale;
            zoom_target.y = (zoom_point.y - this.ty)/this.scale;
            this.scale += dy * -0.01;
            // Restrict scale
            this.scale = Math.min(Math.max(0.125, this.scale), 4);
            this.tx = -zoom_target.x * this.scale + zoom_point.x
            this.ty = -zoom_target.y * this.scale + zoom_point.y
            // Apply scale transform
            this.transform();
        }
        setTimeout(() => {
            const customEvent = new CustomEvent("moved-and-scaled", { detail: {scale: this.scale, x: this.tx, y: this.ty} });
            document.dispatchEvent(customEvent);
        }, 0)
        
    }

    // richiamato solo quando premo sul plsante più e meno
    changeScale(event){
        let scale = 1;
        if (event === 'in'){
            scale = Math.min(Math.max(0.125, (this.scale + this.scaleStep)), 4);
        } else if (event === 'out'){
            scale = Math.min(Math.max(0.125, (this.scale - this.scaleStep)), 4);
        }
        let originRec = this.container.getBoundingClientRect();
        let originDrawer = this.drawer.getBoundingClientRect();
        let diffX = (originRec.x - originDrawer.x);
        let diffY = (originRec.y - originDrawer.y);
        let percScale = scale/this.scale;
        let x1 = ((originRec.width/2)*percScale)+diffX*percScale;
        let y1 = ((originRec.height/2)*percScale)+diffY*percScale;
        const pos = {x: x1, y: y1}
        this.position = pos;
        return this.translateAndScale(pos, scale);
    }
    
    transform() {
        let tcmd = `translate(${this.tx}px, ${this.ty}px)`;
        let scmd = `scale(${this.scale})`;
        const cmd = tcmd + " " + scmd;
        this.drawer.style.transform = cmd;
    }


    getPositionNow(){
        if(window.getComputedStyle(this.drawer)){
            var computedStyle = window.getComputedStyle(this.drawer);
            var transformValue = computedStyle.getPropertyValue('transform');
            if(transformValue !== "none") {
                var transformMatrix = transformValue.match(/matrix.*\((.+)\)/)[1].split(', ');
                var translateX = parseFloat(transformMatrix[4]);
                var translateY = parseFloat(transformMatrix[5]);
                var scaleX = parseFloat(transformMatrix[0]);
                this.tx = translateX;
                this.ty = translateY;
                this.scale = scaleX;
            }
        }
    }




    setDragElement(element) {
        // console.log("[TILEDESK-STAGE-JS]  •••• setDragElement ••••");
        let pos_mouse_x;
        let pos_mouse_y;
        element.onmousedown = (function(event) {
            //this.isDraggingElement = true;
            if (!event.target.classList.contains(this.classDraggable)) {
                return false;
            }
            event = event || window.event;
            event.preventDefault();
            pos_mouse_x = event.clientX;
            pos_mouse_y = event.clientY;
            const custom_event = new CustomEvent("start-dragging", {
                detail: {
                    element: element
                }
            });
            document.dispatchEvent(custom_event);
            document.onmousemove = (function(event) {
                event = event || window.event;
                event.preventDefault();
                const delta_x = event.clientX - pos_mouse_x;
                const delta_y = event.clientY - pos_mouse_y;
                pos_mouse_x = event.clientX;
                pos_mouse_y = event.clientY;
                let pos_x = element.offsetLeft + delta_x / this.scale;
                let pos_y = element.offsetTop + delta_y / this.scale;
                element.style.top = pos_y + "px";
                element.style.left = pos_x + "px";
                const custom_event = new CustomEvent("dragged", {
                    detail: {
                        element: element,
                        x: pos_x, 
                        y: pos_y
                    }
                });
                document.dispatchEvent(custom_event);
            }).bind(this);

            document.onmouseup = (function() {
                document.onmousemove = null;
                document.onmouseup = null;
                //this.isDraggingElement = false;
                const custom_event = new CustomEvent("end-dragging", {
                    detail: {
                        element: element
                    }
                });
                document.dispatchEvent(custom_event);
            }).bind(this);

        }).bind(this);
        
    }
    


    physicPointCorrector(point){
        const container = document.getElementById(this.containerId);
        const container_rect = container.getBoundingClientRect();
        const x = point.x - container_rect.left;
        const y = point.y - container_rect.top;
        return { x: x, y: y };
    }


    centerStageOnPosition(stageElement, scale=1){
        // console.log("[TILEDESK-STAGE-JS]  •••• centerStageOnPosition ••••");
        const pos = this.setPositionByStageElement(stageElement, scale);

        const originRec = this.container.getBoundingClientRect();
        let diff = stageElement.offsetHeight-originRec.height;
        if(diff>0){
            pos.y = pos.y-(diff/2+25);
        }  

        if(pos){
            return this.translateAndScale(pos, scale);
        } else {
            return false;
        }
    }


    // quando seleziono un elemento dal menu di sinistra centro lo stage sull'elemento selezionato
    centerStageOnElement(stageElement, scale=1){
        const pos = this.setPositionByStageElement(stageElement, scale);
        const originRec = this.container.getBoundingClientRect();
        let diff = (stageElement.offsetHeight*scale-originRec.height);
        console.log("[TILEDESK-STAGE-JS]  •••• centerStageOnElement ••••", stageElement.offsetHeight, originRec.height, diff);
        if(diff>0){
            pos.y = pos.y-(diff/2+10);
        }  
        if(pos){
            this.position = pos;
            this.scale = scale;
            this.drawer.style.transition = "transform 0.3s ease-in-out";
            let originRec = this.container.getBoundingClientRect();
            let newX = (originRec.width/2)-pos.x;
            let newY = (originRec.height/2)-pos.y;
            let tcmd = `translate(${newX}px, ${newY}px)`;
            let scmd = `scale(${scale})`;
            const cmd = tcmd + " " + scmd;
            this.drawer.style.transform = cmd;
            this.tx = newX;
            this.ty = newY;
            setTimeout(() => {
                this.drawer.style.removeProperty('transition');
            }, 300);

            return true;
        } else {
            return false;
        }
    }


    centerStageOnCenterPosition(scale=1){
        // console.log("[TILEDESK-STAGE-JS]  •••• centerStageOnCenterPosition ••••");
        let originRec = this.container.getBoundingClientRect();
        let originDrawer = this.drawer.getBoundingClientRect();
        let diffX = (originRec.x - originDrawer.x);
        let diffY = (originRec.y - originDrawer.y);
        let percScale = scale/this.scale;
        let x1 = ((originRec.width/2)*percScale)+diffX*percScale;
        let y1 = ((originRec.height/2)*percScale)+diffY*percScale;
        const pos = {x: x1, y: y1}
        return this.translateAndScale(pos, scale);
    }

    translateAndScale(pos, scale=1){
        // console.log("[TILEDESK-STAGE-JS]  •••• translateAndScale ••••");
        if(pos){
            this.scale = scale;
            this.drawer.style.transition = "transform 0.3s ease-in-out";
            let originRec = this.container.getBoundingClientRect();
            let newX = (originRec.width/2)-pos.x;
            let newY = (originRec.height/2)-pos.y;
            let tcmd = `translate(${newX}px, ${newY}px)`;
            let scmd = `scale(${scale})`;
            const cmd = tcmd + " " + scmd;
            this.drawer.style.transform = cmd;
            this.tx = newX;
            this.ty = newY;
            setTimeout(() => {
                this.drawer.style.removeProperty('transition');
            }, 300);
            return true;
        } else {
            return false;
        }
    }

    translatePosition(pos){
        let originRec = this.container.getBoundingClientRect();
        let newX = (originRec.width/2)-pos.x;
        let newY = (originRec.height/2)-pos.y;
        const newPosition = {
            x: newX, 
            y: newY
        }
        return newPosition;
    }

    setPositionByStageElement(stageElement, scale=1){
        if(stageElement){
            const w = stageElement.offsetWidth*scale;
            const h = stageElement.offsetHeight*scale;
            const x = stageElement.offsetLeft*scale;
            const y = stageElement.offsetTop*scale;
            const posX = x+w/2;
            const posY = y+h/2;
            const pos = {x: posX, y: posY}
            return pos;
        } else {
            return false;
        }
    }
    

    centerStageOnTopPosition(stageElement){
        // console.log("[TILEDESK-STAGE-JS]  •••• centerStageOnTopPosition ••••");
        if(stageElement){
            // var stageElement = document.getElementById(intent.intent_id);
            var w = stageElement.offsetWidth;
            var h = stageElement.offsetHeight;
            var x = stageElement.offsetLeft;
            var y = stageElement.offsetTop;
            this.drawer.style.transition = "transform 0.3s ease-in-out";
            var originRec = this.container.getBoundingClientRect();
            let newX = (originRec.width/2)-(x+w/2);
            let newY = (50)-(y);
            let tcmd = `translate(${newX}px, ${newY}px)`;
            let scmd = `scale(${1})`;
            // let scmd = `scale(${this.scale})`;
            const cmd = tcmd + " " + scmd;
            this.drawer.style.transform = cmd;
            setTimeout(() => {
                this.drawer.style.removeProperty('transition');
                // remove class animation
            }, 300);
            return true;
        } else {
            return false;
        }
    }

    

    centerStageOnHorizontalPosition(stageElement, left=0){
        /// console.log("[TILEDESK-STAGE-JS]  •••• centerStageOnHorizontalPosition ••••");
        if(stageElement){
            const w = stageElement.offsetWidth;
            const h = stageElement.offsetHeight;
            const x = stageElement.offsetLeft;
            const y = stageElement.offsetTop;
            this.drawer.style.transition = "transform 0.3s ease-in-out";
            const originRec = this.container.getBoundingClientRect();
            let newX = (90)-(x+w/2) + left;
            let newY = (originRec.height/2)-(y+h/2)-20;
            let tcmd = `translate(${newX}px, ${newY}px)`;
            let scmd = `scale(${1})`;
            const cmd = tcmd + " " + scmd;
            this.drawer.style.transform = cmd;
            setTimeout(() => {
                this.drawer.style.removeProperty('transition');
            }, 300);
            return true;
        } else {
            return false;
        }
    }  
  
}  