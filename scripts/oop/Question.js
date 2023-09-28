class Question {
    constructor(obj) {
        this.container = obj.container;
        this.id = obj.id;
        this.errorField = obj.errorField;
        this.required = obj.required;
        this.repeatable = obj.repeatable;
    }

    showErrorField() {
        !this.errorField.classList.contains('visible') ? this.errorField.classList.toggle('visible'): null;
    }

    hideErrorField() {
        this.errorField.classList.contains('visible') ? this.errorField.classList.toggle('visible'): null;
    }

    emitValidStatusToTopLevel(id, status) {
        const event = new CustomEvent('questionValidated', {
            detail: {
              questionID: id,
              validationStatus: status
            },
        });
        document.dispatchEvent(event);
    }

    isValid() {
        return this.validate();
    }

    getValue() {
        return { id: this.id, value: this.inputField.value, type: 'text' }
    }
}

export default Question;