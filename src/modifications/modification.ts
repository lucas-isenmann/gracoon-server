import { Board, Vertex, Link, Stroke, Area, TextZone, Representation, Rectangle, BasicVertexData, BasicLinkData, BasicVertex } from "gramoloss";

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

export class ServerBoard extends Board<BasicVertexData, BasicLinkData, Stroke, Area, TextZone, Representation, Rectangle>{
    
}


export interface BoardModification { 
    try_implement(board: ServerBoard): Set<SENSIBILITY> | string;
    deimplement(board: ServerBoard): Set<SENSIBILITY>;
};
