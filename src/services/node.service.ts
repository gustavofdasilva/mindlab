import { ApplicationRef, ElementRef, EnvironmentInjector, Injectable, Renderer2, createComponent, inject } from '@angular/core';
import { BoardService } from './board.service';
import { NgElement, WithProperties, createCustomElement } from '@angular/elements';
import { NodeComponent } from '../components/node/node.component';
import { NodeGroupComponent } from '../components/node-group/node-group.component';
import { uuid } from '@jsplumb/browser-ui';


@Injectable({
  providedIn: 'root'
})
export class NodeService {
  nodes!: ArrayLike<any>
  activeResizeElement: HTMLElement | undefined;
  activeNode: Element | undefined;


  constructor(
    private boardService: BoardService,
    private injector: EnvironmentInjector,
    private applicationRef: ApplicationRef,
  ) {}

  setNodes(newNodes: ArrayLike<any>) {
    this.nodes = newNodes;
  }

  getNodes(): ArrayLike<any> {
    return this.nodes
  }

  resizeMouseDown(event: MouseEvent) {
    this.boardService.draggable = false;
  }

  resizeMouseUp(event: MouseEvent) {
    this.boardService.draggable = true;
  }

  resizeElement(event: MouseEvent, renderer: Renderer2) {
    let mouseX = event.clientX
    let mouseY = event.clientY
    const abstractElement: HTMLElement = renderer.selectRootElement(this.boardService.activeResizeElement, true)

    mouseX = mouseX/this.boardService.zoomScale
    mouseY = mouseY/this.boardService.zoomScale

    const groupId = this.boardService.instance.getId(abstractElement.parentElement)
    const group = this.boardService.instance.getManagedElement(groupId)
    if(group) {
      const groupidtop = group ? Number(getComputedStyle(group).top.replace(/([a-z])/g, '')): 0;
      const groupidleft = group ? Number(getComputedStyle(group).left.replace(/([a-z])/g, '')): 0;
      mouseX= mouseX - groupidleft
      mouseY= mouseY - groupidtop
    }

    let position = {
      top: Number(abstractElement.style.top.replace(/([a-z])/g, '')),
      left: Number(abstractElement.style.left.replace(/([a-z])/g, ''))
    }

    let calcSize = {
      width:((mouseX) - position.left + 10)-this.boardService.translation.x,
      height:((mouseY) - position.top + 10)-this.boardService.translation.y
    }

    renderer.setStyle(abstractElement,'width',`${calcSize.width}px`)
    renderer.setStyle(abstractElement,'height',`${calcSize.height}px`)
  }

  createNode(x: number, y: number, type: string, renderer: Renderer2) {
    let node;
    let nodeComponent;
    switch (type) {
      case 'group':
        node = renderer.createElement('node-group-component');
        nodeComponent = NodeGroupComponent
        break;

      default:
        node = renderer.createElement('node-component');
        nodeComponent = NodeComponent
        break;
    }
    const nodeComponentRef = createComponent(nodeComponent, {
      environmentInjector: this.injector,
      hostElement: node
    })

    let top = (y/this.boardService.zoomScale)-this.boardService.translation.y
    let left = (x/this.boardService.zoomScale)-this.boardService.translation.x

    renderer.addClass(node,'nodeContainer')
    renderer.addClass(node,'node')
    if(type == 'group') renderer.addClass(node,'nodeGroup')
    renderer.setStyle(node,'position','absolute')
    renderer.setStyle(node,'top',`${top}px`)
    renderer.setStyle(node,'left',`${left}px`)

    this.applicationRef.attachView(nodeComponentRef.hostView)

    this.clearActiveNote(renderer)
    this.setActiveNote(node, renderer)

    const container = renderer.selectRootElement('#main',true)
    renderer.appendChild(container, node)
    this.boardService.enablePanzoom()

    if(type == 'group') {//? Check if node type is group node
      this.boardService.instance.addGroup({
        id: uuid(),
        el: node,
        droppable: true,
        orphan: true,
      })
    }

    this.boardService.instance.manage(node)
    return node
  }

  deleteNode(node: Element, renderer: Renderer2) {
    const container = renderer.selectRootElement('#main',true)
    this.boardService.instance.deleteConnectionsForElement(node)
    renderer.removeChild(node.parentElement,node);
  }

  setActiveNote(element: Element, renderer: Renderer2) {
    if(element) {
      if(element != this.activeNode) this.clearActiveNote(renderer)
      if(!element.classList.contains('activeNode')) element.className += ' activeNode'
      this.activeNode = element;
    }
  }

  clearActiveNote(renderer: Renderer2) {
    if(this.activeNode) {
      let element: Element = renderer.selectRootElement(this.activeNode,true);
      if(this.activeNode.className.includes('nodeContainer')) {
        element = this.activeNode
      }
      if(this.activeNode.className.includes('nodeElement')) {
        if(this.activeNode.parentElement) element = this.activeNode.parentElement
      }

        element.className = element.className.replace(' activeNode','');
        let descDiv = element.querySelector('.desc')
        let dragDiv = element.querySelector('.dragDiv')
        if(dragDiv) dragDiv.className = dragDiv.className.replace(' hidden','')
        try {
          renderer.setAttribute(descDiv,'readonly','')
          renderer.setAttribute(descDiv,'disabled','true')
        } catch (error) {}

        this.activeNode = undefined;
    }
  }

}
