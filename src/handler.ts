import { HistBoard } from "./hist_board";
import { BoardModification } from "./modifications/modification";
import * as fs from 'fs';


export function handleGetParameterInfo(paramId: string, callback: (response: string) => void){
    console.log(`Handle: get-parameter-info: ${paramId}`)
    fs.readFile("./dist/src/parameters_info/" + paramId + ".md", 'utf-8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
      
        callback(data);
      });
}

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





