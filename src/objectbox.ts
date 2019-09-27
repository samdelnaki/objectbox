import { Observable, Observer, OperatorFunction, Subject, asyncScheduler, empty } from 'rxjs';

import { Change, ArrayChange } from './change';

/**
 * 
 */
export class ObjectBox {

  private maxHistoryLength: number = 0; // 0 if history is unlimited, or any positive value if limited.
  private debounceLength: 500;

  private target: any = null;

  private historyQueue: Change[][] = [];
  private historyPointer: number = null;

  private arrayHandling: 'smart' | 'brute' = 'brute';

  constructor(target: any = null, options: any = null) {
    if(target!==null) {
      this.setTarget(target);
    }
    if(options!==null) {
      if(options.arrayHandling) {
        this.arrayHandling = options.arrayHandling;
      }
    }
  }

  attachDebounceFieldSource(observable: Observable<any>) {
    observable.pipe(this.debounceFieldOp(this)).subscribe(this.debounceFieldObserver)
  }

  counter: number = 0;
  private debounceFieldObserver: Observer<any> = {
    next: data => {
      this.counter++;
      console.log('debounceFieldObserver next()' + this.counter);
    },
    error: err => {
      console.log('debounceFieldObserver error()');},
    complete: () => {
      console.log('debounceFieldObserver complete() ' + this.counter);}
  };

  debounceFieldOp = (objectBox: ObjectBox) => <T>(source: Observable<T>) =>
    new Observable<T>(observer => {
      let objBox: ObjectBox = objectBox;
      let activeDebounceChange: Change = null;
      return source.subscribe({
        next(obj) {
          // First, we analyse the object tree to see what nodes have changed, if any.
          let changes: Change[];
          let hasChanged  = objBox.scanForDifferences(obj, objBox.target, changes);
          // If there is more than one change, we execute next() immediately.
          if(hasChanged) {
            observer.next(obj);
          } 
          // Else if there is only one change (and at least one change), we debounce it.
          else if(changes.length===1) {
            let change: Change = changes[0];
            if(activeDebounceChange.pointer !== change.pointer) {
              observer.next(obj);
            }
            asyncScheduler.schedule( (debounceChange: Change)=>{
              if(activeDebounceChange===debounceChange) {
                observer.next(obj);
              }
            }, objBox.debounceLength);
          }
        },
        error(err) { observer.error(err); },
        complete() { observer.complete(); }
      })
    });

  /*private debounceFieldObs: Observer<any> = null;
  private debounceField(obj: any) {
    let debounceRequired: boolean = this.updateWithDebounceField(obj);
    if(debounceRequired) {
      let subscription = asyncScheduler.schedule( (datum)=>{
        this.debounceFieldObs.next(datum);
      }, this.debounceLength);
    }
  };*/

  /*private debounceField(obj: any): Observable<any> {
    let debounceRequired: boolean = this.updateWithDebounceField(obj);
    if(debounceRequired) {
      let subscription = asyncScheduler.schedule( (change)=>{
        // If the activeDebounceChange is equivalent to the change object in this function, we
        // know that it hasn't been reset and hence we should commit the change and reset
        // activeDebounceChange to null. 
        if(this.activeDebounceChange===change) {
          this.executeUpdate([this.activeDebounceChange]);
          this.activeDebounceChange=null;
        }
      }, this.debounceLength);
      return Observable.create(subscription);
    } else {
      return empty();
    }
  };*/

  private activeDebounceChange: Change = null;

  private updateWithDebounceField(obj: any): Change {
    // First, we analyse the object tree to see what nodes have changed, if any.
    let changes: Change[] = [];
    let hasChanged = this.scanForDifferences(obj, this.target, changes);
    // If there is more than one change, we commit them immediately.
    if(hasChanged) {
      if(changes.length>1) {
        this.executeUpdate(changes);
      }
      // Else if there is only one change, we debounce it.
      else if(changes.length===1) {
        return changes[0];
        //let change: Change = changes[0];
        // If there's an active debounce change, we check to see if it affects the same node in the object
        // graph. If not we commit it and set the current change to be the active debouce change; If they
        // match, we reset activeDebounceChange to the current change and will restart the debounce timer.
        /*if(this.activeDebounceChange!==null) {
          if(this.activeDebounceChange.pointer !== change.pointer) {
            this.executeUpdate([this.activeDebounceChange]);
          }
          this.activeDebounceChange=change;
          return change;
        }*/
      }
    }
    return null;
  }

  // TODO: Should throw an error if target is reset after being initialised????
  /**
   * 
   * @param target 
   */
  setTarget(target: any): ObjectBox {
    this.target = this.clone(target);
    return this;
  }

  cloneTargetData() {
    return this.clone(this.target);
  }

  createPatchObject(updated: any, original: any = this.target): any {
    let changes: Change[] = [];
    let hasChanged = this.scanForDifferences(updated, original, changes);
    let patch: any = {};
    if(hasChanged) {
      for(let change of changes) {
        if(change.pointer!==null) {
          let path : string[] = change.pointer.split('.');
          // If the pointer begins with a '.', we can ignore the first part of the path.
          if(path[0]==='') {
            path.shift();
          }
          this.setAttribute(patch, path, change);
        }
      }
    }
    return patch;
  }



  /***************************************************************
          D A T A   C H A N G E   M A N A G E M E N T
  ***************************************************************/

  /**
   * Takes an arbitrary object and submits changes based on any differences discovered
   * between it and the current state of the target object (ie: this.target).
   * 
   * @param obj The object containing data which represents one or several changes.
   * @param debounce The number of milliseconds by which the proposed change should be 
   *      debounced, or 'false' or 0 for no debounce. Default is the value of 
   *      debounceLength in this instance.
   */
  update(obj: any): Change[] {
    // First, we analyse the object tree to see what nodes have changed, if any.
    let changes: Change[] = [];
    let hasChanged = this.scanForDifferences(obj, this.target, changes);
    // If changes were found, we commit them.
    if(hasChanged) {
      this.executeUpdate(changes);
    }
    return changes;
  }

  private executeUpdate(changes: Change[]) {
      // Commit the changes to the history chain:
      this.addToHistory(changes);
      // Update the target model to reflect changes:
      this.updateTarget(changes);
  }


  /***************************************************
          H I S T O R Y   M A N A G E M E N T
  ***************************************************/


    
  /**
   * Moves the state of the target object (ie: this.target) back one step in the 
   * history sequence. Returns the changes which we reveresed in order to arrive
   * at this state, or null if there is no previous state.
   */
  goBack(): Change[] {
    let changes: Change[] = this.getChangesForPreviousState();
    if(changes!==null) {
      this.updateTargetReverse(changes);
    }
    return changes;
  }

  /**
   * Moves the state of the target object (ie: this.target) forward one step through
   * the history sequence. Returns the changes which we performed in order to arrive
   * at this state, or null if there is no state future to the current one.
   */
  goForward(): Change[] {
    let changes: Change[] = this.getChangesForNextState();
    if(changes!==null) {
      this.updateTarget(changes);
    }
    return changes;
  }

  /**
   * Returns true if there are object states prior to the current one (ie: the current state is not 
   * the oldest state in the history queue), else false.
   */
  existsPreviousState(): boolean {
    return this.historyPointer >= 0;
  }

  /**
   * Returns true if there are object states future to the current one (ie: the current state is not
   * the most recent state in the history queue), else false.
   */
  existsFutureState(): boolean {
    return this.historyPointer < this.historyQueue.length-1;
  }

  /**
   * 
   * @param changes 
   */
  private addToHistory(changes: Change[]) {
    this.historyQueue.push(changes);

    // We update the history pointer so that we know at what point in the historyQueue the current
    // state of the target object reflects.
    if(this.historyPointer===null)
      this.historyPointer = 0;
    else
      this.historyPointer++

    // If there is history beyond the newly added change(s), it is now obsolete, so we delete it.
    if(this.historyQueue.length>this.historyPointer) {
      // TODO: Confirm that the empty deleteCount deletes everything up until the end of the array.
      this.historyQueue.splice(this.historyPointer+1)
    }

    // Needed if there is a limit to the history queue size.
    this.reduceUndoQueue();
  }

  /**
   * Ensures that the history queue does not exceed the maximum length permitted
   * (as defined by this.historyQueueLength).
   * 
   */
  private reduceUndoQueue() {
    // If maxHistoryLength is zero, there is no limit to the history size, so
    // we return immediately.
    if(this.maxHistoryLength===0)
      return;
    // If history size is greater than the limit, we remove the oldest history element.
    else if(this.historyQueue.length > this.maxHistoryLength) {
      this.historyQueue.shift();
      this.historyPointer--;
      // Check again, just in case at some point the undoQueue was increased beyond undoQueueLength and not reduced:
      this.reduceUndoQueue();
    }
  }

  private getChangesForPreviousState(): Change[] {
    if(this.historyPointer!==null && this.historyPointer>=0) {
      return this.historyQueue[this.historyPointer--];
    } else {
      return null;
    }
  }

  private getChangesForNextState(): Change[] {
    if(this.historyPointer!==null && this.historyPointer<this.historyQueue.length-1) {
      return this.historyQueue[++this.historyPointer];
    } else {
      return null;
    }
  }


  // **************************************
  //        O B S E R V A B L E S
  // **************************************

  updateObserver: Observer<any> = {
    next: data => {
      this.update(data);
      console.log('UPDATED DATA: ' + JSON.stringify(data));
      console.log(JSON.stringify(this.target));
    },
    error: err => {},
    complete: () => {}
  }

  observer(): Observer<any> {
    return this.updateObserver;
  }

  attachToObservable(observable: Observable<any>) {
    observable.subscribe(this.updateObserver);
  }



  modelSubject: Subject<any> = new Subject();
  changeSubject: Subject<Change[]> = new Subject();
  patchSubject: Subject<any> = new Subject();

  subscribeToModelUpdates(subscriber: Observer<any>) {
    this.modelSubject.subscribe(subscriber);
  }
  subscribeToChanges(subscriber: Observer<Change[]>) {
    this.changeSubject.subscribe(subscriber);
  }
  subscribeToPatches(subscriber: Observer<any>) {
    this.patchSubject.subscribe(subscriber);
  }

  private propagateChanges(changes: Change[], patch: any) {
    this.modelSubject.next(this.cloneTargetData());
    this.changeSubject.next(changes);
    this.patchSubject.next(patch);
  }


  // ***************************************************
  //        T A R G E T   M A N A G E M E N T
  // ***************************************************


  /**
   * Executes the changes indicated by the parameter.
   * 
   * @param changes The list of changes to be executed.
   */
  private updateTarget(changes: Change[]) {
    let patch: any  = {};
    for(let change of changes) {
      if(change.pointer!==null) {
        let path : string[] = change.pointer.split('.');
        // If the pointer begins with a '.', we can ignore the first part of the path.
        if(path[0]==='') {
          path.shift();
        }
        if(!this.isRawType(change.updated)) {
          change.updated = this.clone(change.updated);
        }
        this.setAttribute(patch, path, change);
        this.setAttribute(this.target, path, change);
      }
    }
    this.propagateChanges(changes, patch);
  }

  /**
   * Executes the changes indicated by the changes parameter in the reverse direction,
   * i.e.: 'restoring' the previous value, which is in effect an "undo" change.
   * 
   * @param changes The list of changes to be executed.
   */
  private updateTargetReverse(changes: Change[]) {
    let patch: any  = {};
    for(let change of changes.reverse()) {
      if(change.pointer!==null) {
        let path : string[] = change.pointer.split('.');
        // If the pointer begins with a '.', we can ignore the first part of the path.
        if(path[0]==='') {
          path.shift();
        }
        this.setAttribute(patch, path, change, true);
        this.setAttribute(this.target, path, change, true);
      }
    }
    this.propagateChanges(changes, patch);
  }

  /**
   * Locates the attribute indicated by the path parameter and updates it to the
   * new value, creating it if necessary.
   * 
   * @param obj The target object 
   * @param path A string array representing the route to descend through the object graph.
   * @param value The new value.
   */
  private setAttribute(obj: any, path: string[], change: Change, undo: boolean = false) {
    path = Array.from(path);
    let attributeName = path.shift();

    if(change instanceof ArrayChange){
      this.updateArrayElement(obj, attributeName, path, change, undo);
    } else {
      if(path.length>0) {
        // If the attribute is newly created, or was previously a raw type (string, number or boolean),
        // we need to instantiate it as an object.
        if(obj[attributeName]===undefined || this.isRawType(obj[attributeName])) {
          obj[attributeName]={};
        }
        this.setAttribute(obj[attributeName], path, change, undo);
      } else {
        obj[attributeName] = (undo) ? change.previous : change.updated;
      }
    }
  }

  private updateArrayElement(obj: any, attributeName: string, path: string[], change: ArrayChange, undo: boolean) {
    let arrayMatch = /(\w+)\[(\d+)\]/gi.exec(attributeName);
    let arrayIndex;
    if(arrayMatch===null) {
      this.setAttribute(obj, path, change, undo);
    } else {
      attributeName = arrayMatch[1];
      arrayIndex = Number.parseInt(arrayMatch[2]);
      if(path.length>0) {
        // If the element the index refers to is newly created, or was previously 
        // a raw type (string, number or boolean), we need to instantiate it as an object.
        if(obj[attributeName][arrayIndex]===undefined || this.isRawType(obj[attributeName][arrayIndex])) {
          obj[attributeName][arrayIndex]={};
        }
        this.setAttribute(obj[attributeName][arrayIndex], path, change);
      } else {
        // If the attribute is newly created, or was previously a raw type (string, number or boolean),
        // we need to instantiate it as an array.
        if(!obj[attributeName] || this.isRawType(obj[attributeName]))
          obj[attributeName]=[];
        // Then we update the element at arrayIndex, according to the update type
        // and undo status.
        switch(change.type) {
          case 'set':
            if(!undo){
              obj[attributeName][arrayIndex] = change.updated;
            } else {
              obj[attributeName][arrayIndex] = change.previous;
            }
            break;
          case 'insert':
            if(!undo){
              for(let i=0;i<change.updated.length;i++) {
                obj[attributeName].splice(i+arrayIndex,0,change.updated[i]);
              }
            } else {
              obj[attributeName].splice(arrayIndex,change.updated.length);
            }
            break;
          case 'delete':
            if(!undo){
              obj[attributeName].splice(arrayIndex,change.previous.length);
            } else {
              for(let i=0;i<change.previous.length;i++) {
                obj[attributeName].splice(i+arrayIndex,0,change.previous[i]);
              }
            }
            break
        }
      }
    }
  }



  /************************************************
          C H A N G E   D E T E C T I O N
  ************************************************/


  /**
   * Traverses the object graph looking for any elements which differ.
   * Returns an array of Change objects representing the differences discovered.
   * 
   * @param updated The object which potentially contains updates.
   * @param original The original object which is the reference point to discover changes.
   * @param pointer A text value which represents the current position in the object graph. Default is empty string, which is the object root.
   * @param changes The Array of Change objects which will be returned. Default is a new empty array.
   */
  private scanForDifferences(updated: any, original: any, changes: Change[], pointer: string = '', patch: any = {}): boolean {
    // If the update object is null we just check to see if the original was not null and add this change. This case effectively deletes the original object.
    if(updated===null) {
      if(original!==null) {
        changes.push(new Change(pointer, original, updated));
      }
    }
    // If the original object was a null value, simply return a change which replaces it with the new object.
    else if(original===null) {
      if(updated!==null) {
        changes.push(new Change(null, null, updated));
      }
    }
    // If the updated object is 'undefined', we return a change which reflects this. This instance should only occur
    // when scanning an array for deletions, as the object scan is generally carried out based on the updated object's
    // value, using the original object only as a reference.
    //else if(updated===undefined) {
    //  changes.push(new Change(pointer, original, updated));
    //}
    // If the object being tested is a raw type, we are able to examine it directly and add this change.
    else if(typeof updated == 'string' || typeof updated === 'number' || typeof updated === 'boolean') {
      if(updated!==original) {
        changes.push(new Change(pointer, original, updated));
      }
    }
    // If it's an array, we handle it according this instance's configuration.
    else if(updated instanceof Array) {
      switch(this.arrayHandling) {
        case 'brute':
          this.scanArrayBruteMethod(updated, original, changes, pointer, patch);
          break;
        case 'smart':
          this.scanArraySmartMethod(updated, original, changes, pointer, patch);
          break;
      }
    }
    // If we have arrived here, we must be dealing with an object element. Hence, we traverse its object tree by
    // recursively calling this method.
    else {
      for (var property in updated) {
        if(original[property]===undefined) {
          changes.push(new Change(pointer+'.'+property, original[property], updated[property]));
        } else {
          this.scanForDifferences(updated[property], original[property], changes, pointer+'.'+property);
        }
      }
    }
    return changes.length>0;
  }

  private scanArrayBruteMethod(updated: any, original: any, changes: Change[], pointer: string = '', patch: any = {}): boolean {
    if(updated.length !== original.length) {
      changes.push(new Change(pointer, original, updated));
      return true;
    } else {
      let nodeChanges: Change[] = [];
      for(let i=0;i<original.length;i++) {
        this.scanForDifferences(updated[i], original[i], nodeChanges, pointer+`[${i}]`, patch);
        if(nodeChanges.length>0) {
          changes.push(new Change(pointer, original, updated));
          return true;
        }
      }
    }
    return false;
  }

  private scanArraySmartMethod(updated: any, original: any, changes: Change[], pointer: string = '',  patch: any = {}): boolean {
    let lengthDiff = updated.length - original.length;

    if(lengthDiff>0) {
      return this.scanArrayForInserts(updated, original, changes, pointer);
    } else if( lengthDiff<0) {
      return this.scanArrayForDeletions(updated, original, changes, pointer);
    } else {
      return this.scanArrayForModifications(updated, original, changes, pointer);
    }

  }

  private scanArrayForInserts(updated: any, original: any, changes: Change[], pointer: string = '',  patch: any = {}): boolean {
    let changeDetected = false;
    let insertCount = 0;

    for(let i=0;i<updated.length;i++) {
      let hasChanged = this.scanForDifferences(updated[i], original[i-insertCount], []);
      if(hasChanged) {
        changeDetected = true;
        let c: number = -1;
        let j;
        // Loop through elements to find how many were inserted.
        for(j=i+1;j<updated.length;j++) {
          if(!this.scanForDifferences(updated[j],original[i-insertCount],[])) {
            // If we arrive here we know that elements have been inserted from 
            // i (inclusive) to j (exclusive).
            insertCount += c = j-i;
            break;
          }
        }
        // If c was never set, it must mean that elements were 
        // inserted up until the end of the array.
        if(c===-1) {
          insertCount += c = updated.length-i;
        }
        // Now add a Change object.
        let items = updated.slice(i,i+c);
        let arrayChange: ArrayChange = new ArrayChange(`${pointer}[${i}]`,undefined,items,'insert');
        changes.push(arrayChange);
        // Lastly, we now want to jump over all the inserted elements, so we
        // update i to do this (we also skip updated[j], because we already
        // know, by definition, that it does not need to be analysed).
        i=j-1;
      }
    }
    
    return changeDetected;
  }


  private scanArrayForDeletions(updated: any, original: any, changes: Change[], pointer: string = '',  patch: any = {}): boolean {
    let changeDetected = false;
    let deleteCount = 0;

    for(let i=0;i<updated.length;i++) {
      let hasChanged = this.scanForDifferences(updated[i], original[i+deleteCount], []);
      if(hasChanged) {
        changeDetected = true;
        let c: number = -1;
        let j;
        // Loop through elements to find how many were deleted.
        for(j=i+deleteCount+1;j<original.length;j++) {
          if(!this.scanForDifferences(updated[i],original[j],[])) {
            // If we arrive here we know that elements have been deleted from 
            // i (inclusive) to j (exclusive).
            deleteCount += c = j-i-deleteCount;
            break;
          }
        }
        // If c was never set, it must mean that elements were 
        // deleted up until the end of the array.
        if(c===-1) {
          deleteCount += c = updated.length-i+1;
        }
        // Now add a Change object.
        let items = original.slice(i+deleteCount-c,i+deleteCount);
        let arrayChange: ArrayChange = new ArrayChange(`${pointer}[${i}]`,items,undefined,'delete');
        changes.push(arrayChange);
      }
    }
    // Lastly, we check to see if any elements were deleted from the end of the
    // array, which won't have been detected by the loop above:
    if(updated.length+deleteCount < original.length) {
      changeDetected = true;
      let items = original.slice(updated.length, original.length);
      let arrayChange: ArrayChange = new ArrayChange(`${pointer}[${updated.length}]`,items,undefined,'delete');
      changes.push(arrayChange);
    }

    return changeDetected;
  }

  private scanArrayForModifications(updated: any, original: any, changes: Change[], pointer: string = '',  patch: any = {}): boolean {
    let changeDetected = false;
    for(let i=0;i<original.length;i++) {
      let indexChanged = this.scanForDifferences(updated[i],original[i],[],`${pointer}[${i}]`,patch);
      if(indexChanged) {
        let arrayChange: ArrayChange = new ArrayChange(`${pointer}[${i}]`,original[i],updated[i],'set');
        changes.push(arrayChange);
      }
      changeDetected = changeDetected || indexChanged;
    }
    return changeDetected;
  }


  // **************************************
  //           U T I L I T I E S
  // **************************************

  private clone(obj: any) : any {
    return JSON.parse(JSON.stringify(obj));
  }

  private isRawType(element: any) {
    return (typeof element == 'string' || typeof element === 'number' || typeof element === 'boolean')
  }

}
