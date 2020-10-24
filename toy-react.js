const RENDER_TO_DOM = Symbol("render to dom");
export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this.range = null;
    }
    setAttribute(name, value) {
        this.props[name] = value;
    }
    appendChild(component) {
        if (component !== null) {
            this.children.push(component);
        }
    }
    [RENDER_TO_DOM](range) {
        this.range = range;
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](range);
    }
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object'){
            this.update();
            return;
        }
        const merge = (nState, oState) => {
            for(let key in nState) {
                if (oState[key] !== null && typeof oState[key] === 'object') {
                    merge(nState[key], oState[key]);
                } else {
                    oState[key] = nState[key];
                }
            }
        }
        merge(newState, this.state);
        this.update();
    }
    update() {
        let isSameNode = (oNode, nNode) => {
            if (oNode.type !== nNode.type) {
                return false;
            }
            for (let key in nNode.props) {
                if (nNode.props[key] !== oNode.props[key]) {
                    return false;
                }
            }
            if (Object.keys(oNode.props).length !== Object.keys(nNode.props).length) {
                return false;
            }
            if (nNode.type === '#text') {
                if (nNode.content != oNode.content) {
                    return false;
                }
            }
            return true;
        }
        let update = (oVdom, nVdom) => {
            if (!isSameNode(oVdom, nVdom)) {
                nVdom[RENDER_TO_DOM](oVdom.range);
                return;
            }
            nVdom.range = oVdom.range;
            let newChildren = nVdom.vchildren;
            let oldChildren = oVdom.vchildren;

            if (!newChildren || !newChildren.length) {
                return;
            }

            let tailRange = oldChildren[oldChildren.length - 1].range;

            for (let i = 0; i < newChildren.length; i++) {
                let newChild = newChildren[i];
                let oldChild = oldChildren[i];
                if (i < oldChildren.length) {
                    update(oldChild, newChild);
                } else {
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset)
                    range.setEnd(tailRange.endContainer, tailRange.endOffset)
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
            }
        }
        let vdom = this.vdom;
        update(this._vdom, vdom);
        this._vdom = vdom;
    }
    get vdom () {
        return this.render().vdom;
    }
}
class ElementWrapper extends Component{
    constructor(type) {
        super(type)
        this.type = type;
    }
    [RENDER_TO_DOM](range) {
        this.range = range;
        let dom = document.createElement(this.type);
        this._vdom = this.vdom;
        for( let key in this.props) {
            if (key.match(/on([\S\s]+)$/)) {
                dom.addEventListener(RegExp.$1.replace(/^[\s\S]/,c => c.toLowerCase() ), this.props[key]);
            } else if (key === "value" || key === "className") {
                dom[key] = this.props[key];
            } else {
                dom.setAttribute(key, this.props[key]);
            }
        }
        if (!this.vchildren) {
            this.vchildren = this.children.map(child => child.vdom);
        }
        for (let child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(dom, dom.childNodes.length);
            childRange.setEnd(dom, dom.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }
        replaceContent(range, dom);
    }
    get vdom () {
        this.vchildren = this.children.map(child => child.vdom);
        return this;
    }
}
class TextWrapper extends Component {
    constructor(content) {
        super();
        this.content = content;
        this.type = "#text";
    }
    [RENDER_TO_DOM](range) {
        this.range = range;
        let  content = document.createTextNode(this.content);
        replaceContent(range, content);
    }
    get vdom () {
        return this;
    }
}
export function createElement (type, attributes, ...children) {
    let e;
    if (typeof type === "string") {
        e = new ElementWrapper(type);
    } else {
        e = new type;
    }
    for( let p in attributes) {
        e.setAttribute(p, attributes[p]);
    }
    let insertChildren = (children) => {
        for(let child of children) {
            if (typeof child === "string") {
                child = new TextWrapper(child);
            }
            if ((typeof child === "object") && (child instanceof Array)) {
                insertChildren(child)
            } else if(children !== null) {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children)

    return e;
}

function replaceContent(range, node) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();

    range.setStartBefore(node);
    range.setEndAfter(node);
}

export function render (component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}
