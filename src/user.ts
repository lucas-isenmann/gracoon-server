import { Socket } from "socket.io";
import { boards } from ".";
import { HistBoard } from "./hist_board";
import { SENSIBILITY } from "./modifications/modification";
import { makeid } from "./utils";

export class Client {
    socket: Socket;
    board: HistBoard;
    label: string;
    color: string;
    followers: Array<string>;

    constructor(socket: Socket, color: string){
        this.socket = socket;
        this.label = socket.id.substring(0, 5)
        this.color = color;
        this.followers = new Array<string>();

        const roomId = makeid(5);
        socket.join(roomId);
        socket.emit('room_id', roomId); // useless ? TODO remove
        console.log("new room : ", roomId);
        const board = new HistBoard(roomId);
        boards.set(roomId, board);
        
        this.board = board;
        board.clients.set(this.socket.id, this);
        this.emitBoard();
        board.broadcastItsClients();
    }

    joinBoard(board: HistBoard){
        this.board.clients.delete(this.socket.id);

        this.socket.join(board.roomId);
        this.board = board;
        board.clients.set(this.socket.id, this);
        this.emitBoard();
        board.broadcastItsClients();
    }


    emitBoard(){
        const s = new Set([SENSIBILITY.ELEMENT, SENSIBILITY.COLOR, SENSIBILITY.GEOMETRIC]);
        this.socket.emit('graph', [...this.board.graph.vertices.entries()], [...this.board.graph.links.entries()], [...s]);
        this.socket.emit("reset_board", [...this.board.text_zones.entries()]);
        this.socket.emit('strokes', [...this.board.strokes.entries()]);
        this.socket.emit('areas', [...this.board.areas.entries()]);
    }

    /**
     * Emit a message to all the clients of the same room of this client but not to this client.
     */
    broadcast(ev: string, ...args: any[]){
        this.socket.to(this.board.roomId).emit(ev, ...args);
    }
}

