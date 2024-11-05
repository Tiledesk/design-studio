export class TiledeskConnectors {

  constructor(drawerId, classes, connectors) {
    //this.connectors = [];
    this.svgContainerId = "tds_svgContainer";
    this.svgConnectorsId = "tds_svgConnectors";
    this.ids = {
      "arrow": "tds_arrow",
      "arrow_draft": "tds_arrow_draft",
      "arrow_over": "tds_arrow_over",
      "arrow_selected": "tds_arrow_selected"
    }
    this.classes = {
      "connector_selected": "tds_connector_selected",
      "input_block": "tds_input_block",
      "connectable": "tds_connectable",
      "connector": "tds_connector",
      "connector_over": "tds_connector_over",
      "path": "tds_path",
      "connector_draft": "tds_connector_draft",
    }
    this.colors = {
      "black": "#b1b1b7",
      "gray": "gray",
      "blue": "#3ea9f5"
    }

    if (classes && classes["connector_selected"]) {
      this.classes["connector_selected"] = classes["connector_selected"];
    }
    if (classes && classes["input_block"]) {
      this.classes["input_block"] = classes["input_block"];
    }
    if (classes && classes["connectable"]) {
      this.classes["connectable"] = classes["connectable"];
    }
    if (classes && classes["connector"]) {
      this.classes["connector"] = classes["connector"];
    }
    if (classes && classes["connector_over"]) {
      this.classes["connector_over"] = classes["connector_over"];
    }
    if (classes && classes["path"]) {
      this.classes["path"] = classes["path"];
    }

    if (connectors) {
      this.connectors = connectors;
    } else {
      this.connectors = {};
    }
    this.blocks = {};


    // this.svgContainer = document.getElementById("svgConnectors");
    this.drawerId = drawerId;
    this.scale = 1;
    // connector draft drawing (cubic bezier)
    this.drawingBack = { x: 0, y: 0 };
    this.controlBack = { x: 0, y: 0 };
    this.drawingFront = { x: 0, y: 0 };
    this.controlFront = { x: 0, y: 0 };
    this.selectedConnector = null;
    // this.connectorSelectedId = null;

    this.markers = [
      { id: this.ids['arrow'], fill: this.colors['black'], class: this.classes['tds_connector'] },
      { id: this.ids['arrow_draft'], fill: this.colors['gray'], class: this.classes['tds_connector_draft'] },
      { id: this.ids['arrow_over'], fill: this.colors['gray'], class: this.classes['tds_connector_over'] },
      { id: this.ids['arrow_selected'], fill: this.colors['blue'], class: this.classes['tds_connector_selected'] }
    ]

    this.#createSvgContainer();
    this.#createConnectors();
    this.#setEventListners();

  }


  #setEventListners() {
    document.addEventListener('keydown', this.onKeyPressDeleteConnector.bind(this));
    // Rimuovi l'event listener
    // document.removeEventListener('keydown', onKeyPressDeleteConnector);
    // document.removeEventListener('keydown', this.onKeyPressDeleteConnector);
    // document.removeEventListener('keydown', this.onKeyPressDeleteConnector.bind(this));
    // document.removeEventListener(this.onKeyPressDeleteConnector.bind(this));
    // document.removeEventListener(this.onKeyPressDeleteConnector);
  }








  // PUBLIC FUNCTIONS //


  createConnector(fromId, toId, fromPoint, toPoint, save=false, notify=true, attributes=null) {
    // console.log("createConnector:::::  ", fromId, toId, fromPoint, toPoint);
    if(!fromPoint || !toPoint)return;
    const id = fromId + "/" + toId;
    let connector = {
      id: id,
      fromId: fromId,
      toId: toId,
      fromPoint: fromPoint,
      toPoint: toPoint
    }
    this.connectors[connector.id] = connector;
    // connector as outConnector in outBlock
    const parentBlockId = fromId.split("/")[0];
    // let outblock = this.blocks.get(parentBlockId);
    let outblock = this.blocks[parentBlockId];
    if (!outblock) {
      outblock = this.createBlock(parentBlockId);
      this.blocks[outblock.id] = outblock;
    }
    outblock.outConnectors[connector.id] = connector.id;
    // connector as outConnector in outBlock
    const destBlockId = toId.split("/")[0];
    let inblock = this.blocks[destBlockId];
    if (!inblock) {
      inblock = this.createBlock(destBlockId);
      this.blocks[inblock.id] = inblock;
    }
    inblock.inConnectors[connector.id] = connector.id;
    this.#drawConnector(id, fromPoint, toPoint, attributes);
    this.removeConnectorDraft();
    // console.log("connector CREATED id, save, notify:", id, save, notify);
    connector['save'] = save;
    if(notify){
      const event = new CustomEvent("connector-created", { detail: { connector: connector } });
      document.dispatchEvent(event);
    }
  }



  /* ***************************  DELETE *************************** */
  deleteAllConnectors() {
    // console.log('deleteAllConnectors::: ', this.connectors);
    for (const [key, connector] of Object.entries(this.connectors)) {
      this.deleteConnector(connector.id);
    };
  }

  deleteConnectorsThatGoToTheBlockWithId(blockId) {
    // console.log("[JS] deleteConnectorsThatGoToTheBlockWithId ----> ", blockId);
    for (var connectorId in this.connectors) {
      if (connectorId.includes(blockId) && !connectorId.startsWith(blockId)) {
        this.deleteConnector(connectorId);
      }
    }
    // console.log("[JS] blocks :---> ", this.blocks);
    // console.log("[JS] connectors :---> ", this.connectors);
  }

  deleteConnectorsOutOfBlock(blockId, save=false, notify=true) {
    // console.log("[JS] deleteConnectorsOutOfBlock ----> ", blockId);
    for (var connectorId in this.connectors) {
      if (connectorId.startsWith(blockId)) {
        this.deleteConnector(connectorId, save, notify);
      }
    }
    // delete this.blocks[blockId];
    // console.log("[JS] blocks :---> ", this.blocks);
    // console.log("[JS] connectors :---> ", this.connectors);
  }


  deleteConnectorsOfBlockThatDontExist(blockId) {
    // console.log("[JS] deleteConnectorsOfBlockThatDontExist ----> ", blockId);
    for (var connectorId in this.connectors) {
      // // console.log("[JS] connectorId ----> ", connectorId);
      if (connectorId.startsWith(blockId)) {
        // console.log("[JS] INIZIA PER ----> ", blockId);
        // connettore in uscita, non notificare la cancellazione
        const lastIndex = connectorId.lastIndexOf("/");
        const idConnectorElement = connectorId.substring(0, lastIndex);
        // console.log("[JS] idConnectorElement ----> ", idConnectorElement);
        let connectorElement = document.getElementById(idConnectorElement);
        // console.log("[JS] connectorElement ----> ", connectorElement);
        if(!connectorElement)this.deleteConnector(connectorId);
      }
    }
    // console.log("[JS] blocks :---> ", this.blocks);
    // console.log("[JS] connectors :---> ", this.connectors);
  }

  // deleteConnectorWithFromId(fromId) {
  //   // this.connectors.forEach(connector => {
  //   //   console.log("[JS] deleteConnectorWithFromId ----> ", fromId, connector);
  //   //   if (connector.fromId === fromId) {
  //   //     this.deleteConnector(connector.id);
  //   //   }
  //   // });
  //   for (var connectorKey in this.connectors) {
  //     console.log("[JS] deleteConnectorWithFromId ----> ", fromId, connectorKey);
  //     if (connectorKey.startsWith(fromId)) {
  //       const connectorId = this.connectors[connectorKey].id;
  //       let connectorElement = document.getElementById(connectorId);
  //       if(connectorElement){
  //         console.log("[JS] deleteConnectorWithFromId ----> ID",connectorId);
  //         this.deleteConnector(connectorId);
  //       }
  //     }
  //   }
  // }


  /**  */
  deleteConnectorsOfBlock(blockId, save=false, notify=false) {
    // console.log("[JS] deleteConnectorsOfBlock ----> ", blockId);
    let arrayOfDeletedConnectors = [];
    for (var connectorId in this.connectors) {
      if (connectorId.startsWith(blockId)) {
        // connettore in uscita
        this.deleteConnector(connectorId, save, notify);
      } else if (connectorId.includes(blockId)) {
        // connettore in entrata
        arrayOfDeletedConnectors.push(connectorId);
        // console.log("[JS] cancello connettore in Entrata ----> ", connectorId, save, undo);
        this.deleteConnector(connectorId, save, notify);
      }
    }
    delete this.blocks[blockId];
    // console.log("[JS] blocks :---> ", this.blocks);
    // console.log("[JS] connectors :---> ", this.connectors);
    // console.log("[JS] arrayOfDeletedConnectors :---> ", arrayOfDeletedConnectors);
    return arrayOfDeletedConnectors; 
  }



  deleteConnector(connectorId, save=false, notify=true) {
    // console.log('[JS] connectorId: ', connectorId);
    // console.log('[JS] this.blocks: ', this.blocks);
    // console.log('[JS] this.connectors: ', this.connectors);
    let connectorElement = document.getElementById(connectorId);
    // console.log('[JS] this.connectorElement: ', connectorElement);
    if (connectorElement) {
      connectorElement.remove();
      const connectorDeleted = this.connectors[connectorId];
      delete this.connectors[connectorId];
      if (connectorDeleted && notify) {
        connectorDeleted['save'] = save;
        // this.#removeConnector(connectorDeleted, );
        const customEvent = new CustomEvent("connector-deleted", { detail: { connector: connectorDeleted } });
        document.dispatchEvent(customEvent);
      }
    }
  }


  deleteConnectorInBlock(connectorId) {
    // console.log("deleteConnectorInBlock ----> ", this.blocks, connectorId, this.selectedConnector);
    for (var key in this.blocks) {
      var node = this.blocks[key];
      for (var connectorKey in node.outConnectors) {
        // console.log('connectorKey: ', connectorKey);
        if (connectorKey === connectorId) {
          // console.log('CANCELLO : ', node.outConnectors[connectorKey]);
          delete node.outConnectors[connectorKey];
        }
      }
      for (var connectorKey in node.inConnectors) {
        // console.log('connectorKey: ', connectorKey);
        if (connectorKey === connectorId) {
          // console.log('CANCELLO : ', node.inConnectors[connectorKey]);
          delete node.inConnectors[connectorKey];
        }
      }
    }
  }

  // #removeConnector(connectorDeleted) {
  //   const customEvent = new CustomEvent("connector-deleted", { detail: { connector: connectorDeleted } });
  //   document.dispatchEvent(customEvent);
  // }

  onKeyPressDeleteConnector(event) {
    // console.log('onKeyPressDeleteConnector:::: ', event, this.selectedConnector);
    if (event.key === 'Delete' || event.key === 'Backspace' && this.selectedConnector) {
      this.deleteConnector(this.selectedConnector.id, true, true);
    }
  }


  deleteConnectorFromAction(blockId, connId) {
    // console.log("deleteConnectorFromAction ----> ", connId, blockId);
    // console.log("blocks :---> ", this.blocks);
    // console.log("connectors :---> ", this.connectors);
    let block = this.blocks[blockId];
    if (!block) return;
    for (var connectorKey in block.outConnectors) {
      if (connectorKey.startsWith(connId)) {
        delete block.outConnectors[connectorKey];
        this.deleteConnector(connectorKey);
      }
    }
  }

  deleteConnectorsToIntentById(intentId) {
    // console.log("deleteConnectorByToId ----> ", intentId);
    // console.log("blocks :---> ", this.blocks);
    // console.log("connectors :---> ", this.connectors);
    for (var key in this.blocks) {
      var node = this.blocks[key];
      for (var connectorKey in node.outConnectors) {
        if (connectorKey.includes(intentId) && !connectorKey.startsWith(intentId)) {
          // // console.log('DEL CONNECTOR : ', node.outConnectors[connectorKey]);
          delete node.outConnectors[connectorKey];
          this.deleteConnector(connectorKey);
        }
      }
    }
  }



  deleteConnectorsFromActionByActionId(actionId) {
    // // console.log("deleteConnectorsFromActionByActionId ----> ", actionId);
    // // console.log("blocks :---> ", this.blocks);
    // // console.log("connectors :---> ", this.connectors);
    for (var key in this.blocks) {
      var node = this.blocks[key];
      // // console.log('outConnectors: ', node, key);
      for (var connectorKey in node.outConnectors) {
        // // console.log('connectorKey: ', connectorKey);
        if (connectorKey.includes(actionId)) {
          // // console.log('CANCELLO : ', node.outConnectors[connectorKey]);
          delete node.outConnectors[connectorKey];
          this.deleteConnector(connectorKey);
          // let connector = document.getElementById(connectorKey);
          // if (connector) {
          //   connector.remove();
          //   const connectorDeleted = this.connectors[connectorKey];
          //   delete this.connectors[connectorKey];
          //   if(connectorDeleted){
          //     this.#removeConnector(connectorDeleted);
          //   }
          // }
        }
      }
    }
  }


  deleteConnectorsBrokenOutOfBlock(blockId) {
    // // console.log("[JS] deleteConnectorsBrokenOutOfBlock ----> ", this.connectors);
    for (var connectorId in this.connectors) {
      if (connectorId.startsWith(blockId)) {
        // // console.log("[JS] deleteConnectorsBrokenOutOfBlock ----> ", connectorId, blockId);
        let connector = this.connectors[connectorId];
        // // console.log("[JS] deleteConnectorsBrokenOutOfBlock ----> ", connector);
        const fromEle = document.getElementById(connector['fromId']);
        const toEle = document.getElementById(connector['toId']);
        if(!fromEle || !toEle){
          this.deleteConnector(connectorId, false, false);
        }
      }
    }
    // console.log("[JS] blocks :---> ", this.blocks);
    // console.log("[JS] connectors :---> ", this.connectors);
  }

  /** */
  createBlock(blockId) {
    let block = {
      id: blockId
    }
    block.inConnectors = {}; //new Map();
    block.outConnectors = {}; //new Map();
    return block;
  }

  /** */
  updateBlockPosition(blockId, x, y) {
    let block = this.blocks.get(blockId);
    if (block) {
      block.x = x;
      block.y = y;
    }
  }

  /** */
  mousedown(target) {
    this.target = target;
    // // console.log("mousedown");
    this.connectableId = null;
    if (target.addEventListener) {
      target.addEventListener("mousedown", (event) => {
        // console.log("mousedown  el.id:", event.target.id);
        let el = event.target;
        this.#removeSelection(el);
        let elConnectable = this.#searchClassInParents(el, this.classes["connectable"]);
        // // console.log("connectable? ", elConnectable);
        if (elConnectable) {
          // // console.log("connectable", elConnectable.id);
          this.fromId = elConnectable.id;
          this.drawingBack = this.elementLogicCenter(elConnectable);
          this.ref_handleMouseMove;
          this.ref_handleMouseUp;
          target.addEventListener("mousemove", this.ref_handleMouseMove = this.#handleMouseMove.bind(this), false);
          target.addEventListener("mouseup", this.ref_handleMouseUp = this.#handleMouseUp.bind(this), false);
        }
        else {
          // console.log("un-connectable");
        }
      }, false);
      /* 
      target.addEventListener("click", (event) => {
          // console.log("clicked el.id:", event.target.id)
          let el = event.target;
          this.#removeSelection(el);
      }, false);
      */
      // // console.log("mouse down added");
    }
  }




  removeConnectorDraft() {
    let connector = document.getElementById("connectorDraft");
    if (connector) {
      connector.remove();
    }
  }


  moved(element, x, y) {
  //  console.log("moving ----> ", element.id, x, y);
    const blockId = element.id;
    let block = this.blocks[blockId];
    if (!block) {
      return;
    }
    // // console.log("block:---> ", block)
    //block.outConnectors.forEach((conn_id, key) => {
    for (const [key, conn_id] of Object.entries(block.outConnectors)) {
      // for (k in block.outConnectors.keys) {
      // c_id = block.outConnectors[k];
      let conn = this.connectors[conn_id];
      // // console.log("OUT :---> ", conn);
      if (conn) {
        const el = document.getElementById(conn.fromId);
        conn.fromPoint = this.elementLogicCenter(el);
        // // console.log("conn.fromPoint :---> ", conn.fromPoint);
        this.#drawConnector(conn.id, conn.fromPoint, conn.toPoint);
      }
    };
    // block.inConnectors.forEach((conn_id, key) => {
    for (const [key, conn_id] of Object.entries(block.inConnectors)) {
      //for (k in block.inConnectors.keys) {
      //c_id = block.inConnectors[k]
      //let conn = this.connectors.get(conn_id);
      let conn = this.connectors[conn_id];
      if (conn) {
        conn.toPoint.x = x;
        conn.toPoint.y = y + 20;
        this.#drawConnector(conn.id, conn.fromPoint, conn.toPoint);
      }
    };
  }




  /** PRIVATE FUNCTIONS */

  /** createSvgContainer */
  #createSvgContainer() {

    const drawer = document.getElementById(this.drawerId);
    if (!drawer) return;
    let svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.id = this.svgContainerId;
    svgContainer.style.overflow = "visible";
    svgContainer.style.left = "0px";
    svgContainer.style.top = "0px";
    svgContainer.style.position = "absolute";
    svgContainer.style.zIndex = "inherit";

    // Create the `<defs>` element and attributes
    const defsElement = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this.markers.forEach(element => {
      // Create `<marker>` element and attributes
      const markerElement = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      markerElement.setAttribute("id", element.id);
      markerElement.setAttribute("markerWidth", "10");
      markerElement.setAttribute("markerHeight", "20");
      markerElement.setAttribute("refX", "10");
      markerElement.setAttribute("refY", "10");
      markerElement.setAttribute("markerUnits", "userSpaceOnUse");
      markerElement.setAttribute("orient", "auto");
      // Create `<polygon>` element and attributes
      const polygonElement = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygonElement.setAttribute("fill", element.fill);
      polygonElement.setAttribute("class", element.class);
      polygonElement.setAttribute("points", "10 6, 10 14, 2 10");
      // Add the `<polygon>` element as a child of `<marker>`
      markerElement.appendChild(polygonElement);
      // Add the `<marker>` element as a child of `<defs>`
      defsElement.appendChild(markerElement);
    });
    // Add the `<defs>` come figlio di <svg>
    svgContainer.appendChild(defsElement);

    // Create `<g>` element and attributes
    const gElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gElement.id = this.svgConnectorsId;
    gElement.setAttribute("fill", "white");
    gElement.setAttribute("stroke", this.colors['black']);
    gElement.setAttribute("stroke-width", "3");
    svgContainer.appendChild(gElement);

    // Add the `<g>` come figlio di <svg>
    drawer.appendChild(svgContainer);

    this.svgContainer = document.getElementById(this.svgConnectorsId);
  }

  /** createConnectors */
  #createConnectors() {
    //// console.log('createConnectors: ', this.connectors);
    for (const [key, value] of Object.entries(this.connectors)) {
      this.createConnector(value.fromId, value.toId, value.fromPoint, value.toPoint, false, false, null);
    }
  }

  /** searchClassInParents */
  #searchClassInParents(el, keyClass) {
    if (el && el.classList && el.classList.contains(keyClass)) {
      return el;
    }
    // // console.log('[TILEDESK-CONNECTORS] searchClassInParents ->', keyClass);
    let parent = el.parentElement;
    while (parent !== null) {
      if (parent && parent.classList && parent.classList.contains(keyClass)) {
        return parent;
      }
      if (parent.parentElement) {
        parent = parent.parentElement;
      } else {
        // console.log("Nessun elemento parent contiene la classe 'pippo'.");
        parent = null;
      }
    }
    // console.log("Nessun elemento parent contiene la classe 'pippo'.");
    return null;
  }

  /** removeSelection */
  #removeSelection(target) {
    // // console.log("---> resetting connector selection?", this.selectedConnector, target)
    if (this.selectedConnector) {
      if (!target.id || (this.selectedConnector.id !== target.id)) {
        this.selectedConnector.setAttributeNS(null, "class", this.classes["connector"]);
        this.selectedConnector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow'] + ")");
        this.selectedConnector = null;
      }
    }
  }



  /** handleMouseMove */
  #handleMouseMove(event) {
    console.log("move...", event.target.id);
    let mouse_pos_logic;
    const target = event.target;
    let elConnectable = this.#searchClassInParents(target, this.classes["input_block"]);
    if (elConnectable && elConnectable.id && this.fromId) {
      // console.log("1 connectable? ", this.fromId, elConnectable.id);
      // if (this.fromId.startsWith(elConnectable.id)) {
      //   elConnectable = null;
      // }
    }
    if (elConnectable) {
      const block_rect = elConnectable.getBoundingClientRect();
      let pos_x_phis = block_rect.left;
      let pos_y_phis = block_rect.top;
      mouse_pos_logic = this.logicPoint({ x: pos_x_phis, y: pos_y_phis });
      mouse_pos_logic.y = mouse_pos_logic.y + 20;
      this.toPoint = mouse_pos_logic;
      this.toPointPhis = { x: pos_x_phis, y: pos_y_phis };
      if (!this.connectableId) {
        this.connectableId = elConnectable.id;
        const connectorMovedOverIntent = new CustomEvent("connector-moved-over-intent",
          {
            detail: {
              fromId: this.fromId,
              toId: elConnectable.id
            }
          })
        document.dispatchEvent(connectorMovedOverIntent);
        // console.log("connector-moved-over-intent!");
      }
    }
    else {
      let pos_x_phis = event.clientX;
      let pos_y_phis = event.clientY;
      mouse_pos_logic = this.logicPoint({ x: pos_x_phis, y: pos_y_phis });
      this.toPoint = mouse_pos_logic;
      this.toPointPhis = { x: pos_x_phis, y: pos_y_phis };
      const connectorMovedOutOfIntent = new CustomEvent("connector-moved-out-of-intent",
        {
          detail: {
            toId: this.connectableId
          }
        })
      document.dispatchEvent(connectorMovedOutOfIntent);
      // console.log("connector-moved-out-of-intent!");
      this.connectableId = null;
    }
    this.drawingFront = mouse_pos_logic;
    this.#moveControlPoint();
  }

  /** handleMouseUp */
  #handleMouseUp(event) {
    console.log("mouse up event...", event.target.classList);
    this.target.removeEventListener("mousemove", this.ref_handleMouseMove, false);
    this.target.removeEventListener("mouseup", this.ref_handleMouseUp, false);
    // console.log('handleMouseUp ------> ', event.target, event.srcElement);
    const connectable = this.classes["connectable"];
    if (event.target && event.target.classList && event.target.classList.contains(connectable)) {
      return null;
    }
    let elConnectable = this.#searchClassInParents(event.target, this.classes["input_block"]);
    if (elConnectable && elConnectable.id && this.fromId) {
      // console.log("2 connectable? ", this.fromId, elConnectable.id);
      // if (this.fromId.startsWith(elConnectable.id)) {
      //   elConnectable = null;
      // }
    }

    if (elConnectable) {
      console.log("handleMouseUp:::::  ");
      this.createConnector(this.fromId, elConnectable.id, this.drawingBack, this.toPoint, true, true, null);
      const connectorReleaseOnIntent = new CustomEvent("connector-release-on-intent",
        {
          detail: {
            fromId: this.fromId,
            toId: elConnectable.id,
            fromPoint: this.drawingBack,
            toPoint: this.toPoint,
            menuPoint: this.toPointPhis,
            target: event.target
          }
        });
      document.dispatchEvent(connectorReleaseOnIntent);
    }
    else if (this.drawingBack && this.toPoint) {
      // quando rilascio il connector sullo stage e apro il float menu
      // quando rilascio il connector in un altro punto qualsiasi
      // // console.log("connector released on an unsupported element!");
      // this.removeConnectorDraft();
      const fire_event = new CustomEvent("connector-draft-released",
        {
          detail: {
            fromId: this.fromId,
            fromPoint: this.drawingBack,
            toPoint: this.toPoint,
            menuPoint: this.toPointPhis,
            target: event.target
          }
        });
      document.dispatchEvent(fire_event);
      // console.log("connector-draft-released fired!");
    }
  }

  /** moveControlPoint */
  #moveControlPoint() {
    this.#updateControlPoints();
    this.#drawConnectorDraft();
  }

  /** updateControlPoints */
  #updateControlPoints() {
    if (this.drawingFront.x < this.drawingBack.x) {
      const front_back_dist_x = this.drawingBack.x - this.drawingFront.x;
      this.controlFront.x = this.drawingFront.x - (front_back_dist_x);
      this.controlBack.x = this.drawingBack.x + (front_back_dist_x);
    } else {
      const front_back_half_dist = Math.round((this.drawingFront.x - this.drawingBack.x) / 2);
      this.controlFront.x = this.drawingBack.x + front_back_half_dist;
      this.controlBack.x = this.drawingBack.x + front_back_half_dist;
    }
    this.controlFront.y = this.drawingFront.y;
    this.controlBack.y = this.drawingBack.y;
  }


  /** drawConnectorDraft */
  #drawConnectorDraft() {
    let connector = document.getElementById("connectorDraft");
    if (!connector) {
      connector = document.createElementNS("http://www.w3.org/2000/svg", "path");
      connector.setAttributeNS(null, "fill", "transparent");
      connector.setAttributeNS(null, "id", "connectorDraft");
      this.svgContainer.appendChild(connector);
    }
    let controlFront = { x: 0, y: 0 };
    let controlBack = { x: 0, y: 0 };
    controlFront.x = this.drawingFront.x - 200;
    controlFront.y = this.drawingFront.y;
    controlBack.x = this.drawingBack.x + 200;
    controlBack.y = this.drawingBack.y;
    let d = "M" + (this.drawingFront.x - 10) + " " + this.drawingFront.y + " " + "C " + controlFront.x + " " + controlFront.y + " " + controlBack.x + " " + controlBack.y + " " + this.drawingBack.x + " " + this.drawingBack.y;
    connector.setAttributeNS(null, "d", d);
    connector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow_draft'] + ")");
    connector.setAttributeNS(null, "class", this.classes["path"]);
  }

  /** 
   * Creates or modify a connector in HTML
   */
  #drawConnector(id, backPoint, frontPoint, attributes=null) {
    // console.log("drawConnector:::::  ", id, backPoint, frontPoint, attributes);
    var label = null;
    if(attributes && attributes.label){
      label = attributes.label;
    }
    let connector = document.getElementById(id);
    if (!connector) {
      connector = document.createElementNS("http://www.w3.org/2000/svg", "path");
      connector.setAttributeNS(null, "fill", "transparent");
      connector.setAttributeNS(null, "id", id);
      connector.setAttributeNS(null, "class", "connector");
      connector.setAttributeNS(null, "pointer-events", "stroke");

      connector.addEventListener('mouseover', (e) => {
        //// console.log("mouseover e", e.currentTarget);
        if (this.selectedConnector !== null) { // jump highlighting current selection
          if (this.selectedConnector.id !== e.currentTarget.id) {
            e.currentTarget.setAttributeNS(null, "class", this.classes["connector_over"]);
            connector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow_over'] + ")");
          }
        }
        else {
          e.currentTarget.setAttributeNS(null, "class", this.classes["connector_over"]);
          connector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow_over'] + ")");
        }
      });
      connector.addEventListener('mouseleave', (e) => {
        //// console.log("mouseleave e", e.currentTarget);
        if (!e.currentTarget.classList.contains(this.classes["connector_selected"])) {
          e.currentTarget.setAttributeNS(null, "class", this.classes["connector"]);
          connector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow'] + ")");
        }
      });
      connector.addEventListener('click', (e) => {
        let pos_x_phis = e.clientX;
        let pos_y_phis = e.clientY;
        let mouse_pos_logic = this.logicPoint({ x: pos_x_phis, y: pos_y_phis });
        let toPointPhis = { x: pos_x_phis, y: pos_y_phis };
        // console.log("clicked e", e, toPointPhis, mouse_pos_logic);
        // console.log("clicked e", e.currentTarget);
        if (this.selectedConnector) {
          this.selectedConnector.setAttributeNS(null, "class", this.classes["connector"]);
          this.selectedConnector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow'] + ")");
        }
        this.selectedConnector = e.currentTarget;
        this.selectedConnector.setAttributeNS(null, "class", this.classes["connector_selected"]);
        this.selectedConnector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow_selected'] + ")");
        const event = new CustomEvent("connector-selected", { detail: { connector: connector, mouse_pos: mouse_pos_logic } });
        document.dispatchEvent(event);
      });
      this.svgContainer.appendChild(connector);

      // add lineText to connector
      const x = (frontPoint.x + backPoint.x) / 2;
      const y = (frontPoint.y + backPoint.y) / 2;
      let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      let lineText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lineText.setAttributeNS(null, "id", "label_"+id);
      lineText.setAttributeNS(null, "x", String(x));
      lineText.setAttributeNS(null, "y", String(y));
      lineText.setAttributeNS(null, "text-anchor", "middle");
      lineText.setAttributeNS(null, "dominant-baseline", "middle");
      lineText.setAttributeNS(null, "stroke", "none");
      lineText.setAttributeNS(null, "fill", "#b1b1b7");
      lineText.setAttributeNS(null, "style", `font-size: 12px;`);
      lineText.textContent = label;
      group.appendChild(lineText);
      const bbox = lineText.getBBox();
      group.removeChild(lineText);
      const rectWidth = bbox.width?bbox.width+10:0;
      const rectHeight = bbox.height?bbox.height+10:0;
      let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttributeNS(null, "id", "rect_"+id);
      rect.setAttributeNS(null, "x", String( x - rectWidth / 2));
      rect.setAttributeNS(null, "y", String( y - rectHeight / 2));
      rect.setAttributeNS(null, "width", String(rectWidth));
      rect.setAttributeNS(null, "height", String(rectHeight));
      rect.setAttributeNS(null, "fill", "#fcfafa");
      rect.setAttributeNS(null, "stroke", "none");
      rect.setAttributeNS(null, "rx", "8"); 
      // rect.setAttributeNS(null, "style", `left:${x}; top:${y};`);
      group.appendChild(rect);
      group.appendChild(lineText);
      this.svgContainer.appendChild(group);
    }

    // control points
    let controlFront = { x: 0, y: 0 };
    let controlBack = { x: 0, y: 0 };
    controlFront.x = frontPoint.x - 200;
    controlFront.y = frontPoint.y;
    controlBack.x = backPoint.x + 200;
    controlBack.y = backPoint.y;
    let d = "M" + (frontPoint.x - 10) + " " + frontPoint.y + " " + "C " + controlFront.x + " " + controlFront.y + " " + controlBack.x + " " + controlBack.y + " " + backPoint.x + " " + backPoint.y;// + " marker-end=\"url(#arrowhead)\"";
    connector.setAttributeNS(null, "d", d);
    connector.setAttributeNS(null, "marker-start", "url(#" + this.ids['arrow'] + ")");
    this.updateLineTextPosition(id, frontPoint, backPoint);


    const event = new CustomEvent("connector-drawn", { detail: { connector: connector } });
    document.dispatchEvent(event);
  }

  updateLineTextPosition(id, frontPoint, backPoint){
    let lineText = document.getElementById("label_"+id);
    let rect = document.getElementById("rect_"+id);
    if (lineText && rect) {
      const bbox = lineText.getBBox();
      var rectWidth = 0;
      var rectHeight = 0;
      if(lineText.textContent && lineText.textContent !== ''){
        rectWidth = bbox.width + 10;
        rectHeight = bbox.height + 10;
      } 
      const x = (frontPoint.x + backPoint.x) / 2;
      const y = (frontPoint.y + backPoint.y) / 2;
      lineText.setAttributeNS(null, "x", String(x));
      lineText.setAttributeNS(null, "y", String(y));
      rect.setAttributeNS(null, "x",  String(x - rectWidth / 2));
      rect.setAttributeNS(null, "y", String(y - rectHeight / 2));
      rect.setAttributeNS(null, "width", String(rectWidth));
      rect.setAttributeNS(null, "height", String(rectHeight));
    }
  }

  /** Measure from phisical to logical */

  #toLogicScale(measure) {
    return measure / this.scale;
  }

  /** Coordinate from phisical to logical */
  logicPoint(coords) {
    const drawer = document.getElementById(this.drawerId);
    var drawer_rect = drawer.getBoundingClientRect();
    // https://stackoverflow.com/questions/24883585/mouse-coordinates-dont-match-after-scaling-and-panning-canvas
    const shift_x = this.#toLogicScale(drawer_rect.left); //d_rect.left / scale
    const shift_y = this.#toLogicScale(drawer_rect.top); //d_rect.top / scale
    const x = this.#toLogicScale(coords.x) - shift_x; //mouse_x / scale - shift_x
    const y = this.#toLogicScale(coords.y) - shift_y; //(mouse_y) / scale - shift_y
    return { x: x, y: y };
  }

  /** elementLogicCenter */
  elementLogicCenter(element) {
    const rect = element.getBoundingClientRect();
    //// console.log("Logic center of phisical rect:", rect);
    let logic_rect_pos = this.logicPoint({ x: rect.left, y: rect.top })
    //// console.log("center: logic_rect_pos:", logic_rect_pos);
    const logic_width = this.#toLogicScale(rect.width);
    //// console.log("center: logic_width:", logic_width);
    const logic_height = this.#toLogicScale(rect.height);
    //// console.log("center: logic_height:", logic_height);
    let center_x = logic_rect_pos.x + logic_width / 2;
    let center_y = logic_rect_pos.y + logic_height / 2;
    //// console.log("center_x:", center_x);
    //// console.log("center_y:", center_y);
    return { x: center_x, y: center_y };
  }

  elementLogicTopLeft(element) {
    // console.log('elementLogicTopLeft');
    let elConnectable = this.#searchClassInParents(element, this.classes["input_block"]);
    if (elConnectable) {
      const block_rect = elConnectable.getBoundingClientRect();
      let pos_x_phis = block_rect.left;
      let pos_y_phis = block_rect.top;
      let mouse_pos_logic = this.logicPoint({ x: pos_x_phis, y: pos_y_phis });
      mouse_pos_logic.y = mouse_pos_logic.y + 20;
      // // console.log("toPoint? ", elConnectable);
      // // console.log("mouse_pos_logic? ", mouse_pos_logic);
      // // console.log("pos_y_phis? ", pos_y_phis);
      return mouse_pos_logic;
    }
  }


  // createConnectorFromId(fromId, toId, save=false, undo=false, notify=false) {
  //   // console.log("createConnectorFromId fromId - toId:", fromId, toId);
  //   const fromEle = document.getElementById(fromId);
  //   const toEle = document.getElementById(toId);
  //   if (toEle && fromEle) {
  //     const fromPoint = this.elementLogicCenter(fromEle);
  //     const toPoint = this.elementLogicTopLeft(toEle);
  //     this.createConnector(fromId, toId, fromPoint, toPoint, save, undo);
  //     return true;
  //   }
  //   return false;
  // }



  updateConnectorsOutOfItent(element) {
    // console.log("updateConnectorsOutOfItent ----> ", this.blocks, element.id);
    const blockId = element.id;
    let block = this.blocks[blockId];
    if (!block) { return; }
    // console.log("block :---> ", block);
    for (const [key, conn_id] of Object.entries(block.outConnectors)) {
      let conn = this.connectors[conn_id];
      // console.log("conn :---> ", this.connectors, conn_id);
      if (conn) {
        // console.log("OUT :---> ", conn);
        const elFrom = document.getElementById(conn.fromId);
        if (elFrom) {
          conn.fromPoint = this.elementLogicCenter(elFrom);
          // console.log("conn.fromPoint :---> ", elFrom, conn.fromId, conn.fromPoint);
        }
        const elToId = document.getElementById(conn.toId);
        if (elToId) {
          conn.toPoint = this.elementLogicTopLeft(elToId);
          // console.log("conn.toPoint :---> ", elToId, conn.toId, conn.toPoint);
        }
        // console.log("conn :---> ", elFrom, elToId);
        if(elFrom && elToId){
          this.#drawConnector(conn.id, conn.fromPoint, conn.toPoint);
          conn['notify']='';
          // const event = new CustomEvent("connector-updated", { detail: { connector: conn } });
          // document.dispatchEvent(event);
        } else {
          this.deleteConnector(conn_id, false, true);
        }
        
      }
    };
  }


  // updateConnectorAttributes(id, attributes=null) {
  //   console.log("updateConnectorAttributes:::::  ", attributes);
  //   let lineText = document.getElementById("label_"+id);
  //   if (lineText) {
  //     var label = null;
  //     if(attributes && attributes.label){
  //       label = attributes.label;
  //     }
  //     lineText.textContent = label;
  //   }
  // }

  // refreshConnectorsOutOfItent(element) {
  //   console.log("refreshConnectorsOutOfItent ----> ", this.blocks, element.id);
  //   const blockId = element.id;
  //   let block = this.blocks[blockId];
  //   if (!block) { return; }
  //   console.log("block :---> ", block);
  //   for (const [key, conn_id] of Object.entries(block.outConnectors)) {
  //     let conn = this.connectors[conn_id];
  //     console.log("conn :---> ", this.connectors, conn_id);
  //     if (conn) {
  //       console.log("OUT :---> ", conn);
  //       const elFrom = document.getElementById(conn.fromId);
  //       if (elFrom) {
  //         conn.fromPoint = this.elementLogicCenter(elFrom);
  //         // console.log("conn.fromPoint :---> ", elFrom, conn.fromId, conn.fromPoint);
  //       }
  //       const elToId = document.getElementById(conn.toId);
  //       if (elToId) {
  //         conn.toPoint = this.elementLogicTopLeft(elToId);
  //         // console.log("conn.toPoint :---> ", elToId, conn.toId, conn.toPoint);
  //       }
  //       this.#drawConnector(conn.id, conn.fromPoint, conn.toPoint);
  //       conn['notify']='';
  //       // const event = new CustomEvent("connector-updated", { detail: { connector: conn } });
  //       // document.dispatchEvent(event);
  //     } else {
  //       var lastIndex = conn_id.lastIndexOf("/");
  //       if (lastIndex !== -1) {
  //         var fromId = conn_id.substring(0, lastIndex);
  //         var toId = conn_id.substring(lastIndex + 1);
  //         this.createConnectorFromId(fromId, toId);
  //       }
  //     }
  //   };
  // }
  updateConnectorsOfItent(element) {
    // console.log("updateConnectorsOfItent ----> ", this.blocks, element.id);
    this.updateConnectorsOutOfItent(element);
  }

}