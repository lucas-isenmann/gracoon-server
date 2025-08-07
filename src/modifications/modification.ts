import { Option, Board, Stroke, Area, TextZone, Representation, Rectangle, BasicVertexData, BasicLinkData, BasicVertex, BasicLink, Coord } from "gramoloss";
import { HistBoard } from "../hist_board";

export enum SENSIBILITY {
    GEOMETRIC = "GEOMETRIC", // Move of vertex/link
    COLOR = "COLOR", // Change of color for vertices/links
    ELEMENT = "ELEMENT", // Create/delete vertex/link
    WEIGHT = "WEIGHT"
}

export enum RESIZE_TYPE {
    BOTTOM = "BOTTOM",
    TOP = "TOP",
    LEFT = "LEFT",
    RIGHT = "RIGHT",
    TOP_RIGHT = "TOP_RIGHT",
    TOP_LEFT = "TOP_LEFT",
    BOTTOM_RIGHT = "BOTTOM_RIGHT",
    BOTTOM_LEFT = "BOTTOM_LEFT"
}


export enum BoardElementKind {
    TextZone = "TextZone",
    Area = "Area",
    Vertex = "Vertex",
    Link = "Link",
    Stroke = "Stroke",
    Rectangle = "Rectangle"
}

export function kindOfElement(element: BasicVertex<BasicVertexData> | BasicLink<BasicVertexData, BasicLinkData> | Stroke | Area | TextZone | Rectangle ): BoardElementKind{
    if (element instanceof BasicVertex){
        return BoardElementKind.Vertex;
    } else if (element instanceof BasicLink){
        return BoardElementKind.Link;
    } else if (element instanceof Stroke){
        return BoardElementKind.Stroke;
    } else if (element instanceof Area){
        return BoardElementKind.Area;
    } else if (element instanceof Rectangle){
        return BoardElementKind.Rectangle;
    } 
        return BoardElementKind.TextZone;
}



export class ServerLinkData extends BasicLinkData {
    strokeStyle: string = "normal";
    
    constructor(cp: Option<Coord>, weight: string, color: string, strokeStyle: string){
        super(cp, weight, color);
        this.strokeStyle = strokeStyle;
    }
}

export class ServerBoard extends Board<BasicVertexData, ServerLinkData, Stroke, Area, TextZone, Representation, Rectangle>{
    
}


export interface BoardModification { 
    try_implement(board: ServerBoard): Set<SENSIBILITY> | string;
    deimplement(board: ServerBoard): Set<SENSIBILITY>;
    firstEmitImplementation(board: HistBoard): void;
    emitImplementation(board: HistBoard): void;
    emitDeimplementation(board: HistBoard): void;
};
