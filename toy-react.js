const RENDER_TO_DOM = Symbol("render to dom");
class ElementWrapper {
    constructor(type) {
        this.root = document.createElement(type);
    }
    setAttribute(name, value) {
        if (name.match(/on([\S\s]+)$/)) {
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/,c => c.toLowerCase() ), value);
        } else if (name === "value" || name === "className") {
            this.root[name] = value;
        } else {
            this.root.setAttribute(name, value);
        }
    }
    appendChild(component) {
        if (component === null) {
            return;
        }
        const range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        component[RENDER_TO_DOM](range);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}
class TextWrapper {
    constructor(content) {
        this.root = document.createTextNode(content)
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}
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
        this.children.push(component);
    }
    [RENDER_TO_DOM](range) {
        this.range = range;
        this.render()[RENDER_TO_DOM](range);
    }
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object'){
            this.rerender();
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
        this.rerender();
    }
    rerender () {
        this.range.deleteContents();
        this[RENDER_TO_DOM](this.range);
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
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children)

    return e;
}

export function render (component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}
