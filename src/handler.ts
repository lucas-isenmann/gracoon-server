import { HistBoard } from "./hist_board";
import { BoardModification } from "./modifications/modification";





export function handleBoardModification(board: HistBoard, modif: BoardModification | undefined){
    if (typeof modif == "undefined"){
        console.log(`Error: cannot handle modification`);
        return;
    }
    const r = board.try_push_new_modification(modif);
    if (typeof r === "string") {
        console.log(r);
    } else {
        modif.firstEmitImplementation(board);
        modif.emitImplementation(board);
    }
}





