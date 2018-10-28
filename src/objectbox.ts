import { Observer, Subject } from 'rxjs';

import { Change } from './change';

/**
 * 
 */
export class ObjectBox {
  private maxHistoryLength: number = 0; // 0 if history is unlimited, or any positive value if limited.

  private target: any = null;

  private historyQueue: Change[][] = [];
  private historyPointer: number = null;

  // TODO: Should throw an error if target is reset after being initialised????
  /**
   * 
   * @param target 
   */
  setTarget(target: any): ObjectBox {
    this.target = target;
    return this;
  }

  cloneTargetData() {
    return JSON.parse( JSON.stringify(this.target) );
  }

  createPatchObject(updated: any, original: any = this.target): any {
    let changes: Change[] = this.scanForDifferences(updated, original);
    let patch: any = {};
    for(let change of changes) {
      if(change.pointer!==null) {
        let path : string[] = change.pointer.split('.');
        // If the pointer begins with a '.', we can ignore the first part of the path.
        if(path[0]==='') {
          path.shift();
        }
        this.setAttribute(patch, path, change.updated);
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
    let changes: Change[] = this.scanForDifferences(obj, this.target);
    // If changes were found, we commit them.
    if(changes.length>0) {
      // Commit the changes to the history chain:
      this.addToHistory(changes);
      // Update the target model to reflect changes:
      this.updateTarget(changes);
    }
    return changes;
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


  /***************************************************
          O B S E R V A B L E   M E T H O D S
  ***************************************************/

  modelSubject: Subject<any> = new Subject();
  changeSubject: Subject<Change[]> = new Subject();

  subscribeToModelUpdates(subscriber: Observer<any>) {
    this.modelSubject.subscribe(subscriber);
  }
  subscribeToChangeList(subscriber: Observer<Change[]>) {
    this.changeSubject.subscribe(subscriber);
  }

  private propagateChanges(changes: Change[]) {
    this.modelSubject.next(this.cloneTargetData());
    this.changeSubject.next(changes);
  }


  /***************************************************
          T A R G E T   M A N A G E M E N T
  ***************************************************/


  /**
   * Executes the changes indicated by the parameter.
   * 
   * @param changes The list of changes to be executed.
   */
  private updateTarget(changes: Change[]) {
    for(let change of changes) {
      if(change.pointer!==null) {
        let path : string[] = change.pointer.split('.');
        // If the pointer begins with a '.', we can ignore the first part of the path.
        if(path[0]==='') {
          path.shift();
        }
        this.setAttribute(this.target, path, change.updated);
      }
    }
    this.propagateChanges(changes);
  }

  /**
   * Executes the changes indicated by the changes parameter in the reverse direction,
   * i.e.: 'restoring' the previous value, which is in effect an "undo" change.
   * 
   * @param changes The list of changes to be executed.
   */
  private updateTargetReverse(changes: Change[]) {
    for(let change of changes) {
      if(change.pointer!==null) {
        let path : string[] = change.pointer.split('.');
        // If the pointer begins with a '.', we can ignore the first part of the path.
        if(path[0]==='') {
          path.shift();
        }
        this.setAttribute(this.target, path, change.previous);
      }
    }
    this.propagateChanges(changes);
  }

  /**
   * Locates the attribute indicated by the path parameter and updates to the
   * new value.
   * 
   * @param obj The target object 
   * @param path A string array representing the route to descend through the object graph.
   * @param value The new value.
   */
  private setAttribute(obj: any, path: string[], value: any) {
    let attributeName = path.shift();
    if(path.length>0) {
      if(obj[attributeName]===undefined) {
        obj[attributeName]={};
      }
      this.setAttribute(obj[attributeName], path, value);
    } else {
      obj[attributeName] = value;
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
  private scanForDifferences(updated: any, original: any, pointer: string = '', changes: Change[] = []): Change[] {
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
    // If the object being tested is a raw type, we are able to examine it directly and add this change.
    else if(typeof updated == 'string' || typeof updated === 'number' || typeof updated === 'boolean') {
      if(updated!==original) {
        changes.push(new Change(pointer, original, updated));
      }
    }
    // Since there is currently no capacity to handle arrays, we just log this error and continue.
    else if(updated instanceof Array) {
      console.log('Cant yet handle arrays, sorry');
    }
    // If we have arrived here, we must be dealing with an object element. Hence, we traverse its object tree by
    // recursively calling this method.
    else {
      for (var property in updated) {
        if(original[property]===undefined) {
          changes.push(new Change(pointer+'.'+property, original[property], updated[property]));
        } else {
          this.scanForDifferences(updated[property], original[property], pointer+'.'+property, changes);
        }
      }
    }
    return changes;
  }

}