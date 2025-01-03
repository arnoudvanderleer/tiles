export default class UndoStack {
    constructor(undo_button, redo_button, refresh) {
        this.undo_actions = [];
        this.redo_actions = [];

        this.undo_button = undo_button;
        this.redo_button = redo_button;

        undo_button.addEventListener('click', () => this.undo());
        redo_button.addEventListener('click', () => this.redo());
        this.refresh = refresh;
    }

    add_undo_action() {
        this.redo_actions = [];
        let new_action = {undo: [], redo: []};
        this.undo_actions.push(new_action);
        this.refresh_buttons();
        return new_action;
    }

    undo() {
        if (this.undo_actions.length == 0) {
            return;
        }
        let action = this.undo_actions.pop();
        this.redo_actions.push(action);
        action.undo.forEach(a => a());
        this.refresh();
        this.refresh_buttons();
    }

    redo() {
        if (this.redo_actions.length == 0) {
            return;
        }
        let action = this.redo_actions.pop();
        this.undo_actions.push(action);
        action.redo.forEach(a => a());
        this.refresh();
        this.refresh_buttons();
    }

    refresh_buttons() { 
        if (this.undo_actions.length == 0) {
            this.undo_button.classList.add('disabled');
        } else {
            this.undo_button.classList.remove('disabled');
        }
        if (this.redo_actions.length == 0) {
            this.redo_button.classList.add('disabled');
        } else {
            this.redo_button.classList.remove('disabled');
        }
    }
}