import { send } from "../fx/uploadFiles.js";
import Question from "./Question.js";

export class Field extends Question {
    constructor(obj) {
        super(obj);
        this.inputField = this.container.querySelector('input');
        this.inputField.addEventListener('blur', this.handleOnBlur.bind(this));
    }

    validate(value) {
        if (this.required && this.inputField.value.trim() === '') {
            this.showErrorField();
            return false;
        }
        this.hideErrorField();
        return true;
    }

    handleOnBlur(e) {
        const validated = this.validate(e.target.value)
        this.emitValidStatusToTopLevel(this.id, validated)
    }
}

export class Area extends Question {
    constructor(obj) {
        super(obj); // Call the constructor of the parent class
        this.inputField = this.container.querySelector('textarea');
        this.inputField.addEventListener('blur', this.handleOnBlur.bind(this));
    }
    validate(value) {
        if (this.required && this.inputField.value.trim() === '') {
            this.showErrorField();
            return false;
        }
        this.hideErrorField();
        return true;
    }

    handleOnBlur(e) {
        const validated = this.validate(e.target.value)
        this.emitValidStatusToTopLevel(this.id, validated)
    }
}

export class MultipleChoice extends Question {
    constructor(obj) {
        super(obj); // Call the constructor of the parent class
        this.options = this.container.querySelectorAll('ul li')
    }
    isValid() {
        return true;
    }

    async getValue() {
        const values = [];
        this.options.forEach(option => values.push({id: option.querySelector('input').id, val: option.querySelector('input').innerHTML}))
        return {id: this.id, value: values, type: 'mpc'}
    }
}

export class TrueFalse extends Question {
    constructor(obj) {
        super(obj);
        this.inputField = this.container.querySelector('input');
    }

    isValid() {
        return true;
    }

    getValue() {
        return { id: this.id, value: this.inputField.value, type: 'true/false' }
    }
}

export class RepeatableMultiField extends Question {
    constructor(obj) {
        super(obj);
        this.repeatableName = this.container.getAttribute('multifield_name');
        this.repeatableHTML = this.container.querySelector('ul').cloneNode(true);
        this.repeatable_sections = [];
        this.initializeRepeaterElement(0);
        this.controls();
    }

    generateControlHTML (){
        const controlContainer = document.createElement('div');
        controlContainer.classList.add('controlcontainer')
        
        const addBtn = document.createElement('button');
        addBtn.classList.add('control_button')
        addBtn.setAttribute('action', 'add');
        addBtn.innerHTML = "+"
        addBtn.addEventListener('click', this.handleAmountOfRepeatedFields.bind(this))

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('control_button')
        removeBtn.setAttribute('action', 'remov');
        removeBtn.disabled = true;
        removeBtn.innerHTML = "-"
        removeBtn.addEventListener('click', this.handleAmountOfRepeatedFields.bind(this))
    
        controlContainer.append(addBtn, removeBtn);
        return controlContainer;
    }

    handleAmountOfRepeatedFields(e) {
        e.preventDefault();
        if(e.target.getAttribute('action') === 'add'){
            const repeatableSection = this.repeatableHTML.cloneNode(true);
            const newRepeatableId = parseInt(repeatableSection.getAttribute('repeatable_id')) + 1
            repeatableSection.setAttribute('repeatable_id', newRepeatableId);
            this.container.appendChild(repeatableSection)
            const fields = this.container.querySelectorAll(`ul[repeatable_id="${newRepeatableId}"] li`)
            this.repeatable_sections.push({fieldset: this.initializeFieldsInRepeater(fields, newRepeatableId), container: repeatableSection});
            this.areFieldsValid();

            if (this.repeatable_sections.length > 1) {
                document.querySelector('.control_button[action="remov"]').disabled = false;
            }

        } else if(e.target.getAttribute('action') === 'remov') {
            this.repeatable_sections[this.repeatable_sections.length - 1].container.parentNode.removeChild(this.repeatable_sections[this.repeatable_sections.length - 1].container);
            this.repeatable_sections.pop();

            if (this.repeatable_sections.length === 1) {
                document.querySelector('.control_button[action="remov"]').disabled = true;
            }
        }
    }

    controls(element_id) {
        const controls = this.generateControlHTML();
        this.container.appendChild(controls);
    }
    
    initializeFieldsInRepeater(questions, repeater_id) {
        const fields = [];
        questions.forEach(question => {
            const id = question.getAttribute('subquestion_id') + `_${repeater_id}`;
            const input = question.querySelector('input');
            const type = input.getAttribute("type");
            const fieldObj = { id, type, input, status: false };

            if (type === "text") {
                input.addEventListener('blur', this.handleOnBlur.bind(this, fieldObj));
            } else if (type === "file") {
                input.addEventListener('change', this.handleOnChange.bind(this, fieldObj));
            }

            fields.push(fieldObj);
        });
        return fields;
    }

    initializeRepeaterElement(id) {
        const repeater = this.container.querySelector(`ul[repeatable_id="${id}"]`);
        const fields = this.container.querySelectorAll(`ul[repeatable_id="${id}"] li`)

        this.repeatable_sections.push({fieldset: this.initializeFieldsInRepeater(fields, id), container: repeater});
    }

    validateText(field) {
        return field.input.value.trim() !== '';
    }

    async validateFile(field) {
       field.files.for
        return field.input.files.length > 0;
    }

    async validateField(field) {
        if (field.type === 'text') {
            return this.validateText(field);
        } else if (field.type === 'file') {
            return await this.validateFile(field);
        }
        return true; // Default to true for other types
    }

    areFieldsValid() {
        let allValid = true; 
        const iterator = this.repeatable_sections.values()
        for(let section of iterator) {
            if(!section.fieldset.every(field => field.input.value.trim().length > 0)){
                allValid = false
                break;
            }
        }
        this.emitValidStatusToTopLevel(this.id, allValid);
    }

    handleOnBlur(field) {
        const validated = this.validateField(field);
        field.status = validated;
        this.areFieldsValid();
    }

    handleOnChange(field) {
        const validated = this.validateField(field);
        field.status = validated;
        this.areFieldsValid();
    }

    async getValue() {
        const values = [];
    
        for (const section of this.repeatable_sections) {
            const section_values = [];
    
            for (const field of section.fieldset) {
                if (field.type === 'text') {
                    section_values.push({ id: field.id, val: field.input.value, type: 'text' });
                } else if (field.type === 'file') {
                    const filesToSend = [];
                    
                    // Create an array of promises for sending each file
                    const filePromises = Array.from(field.input.files).map(async (file) => {
                        const url = await send(file);
                        filesToSend.push(url);
                    });
                    
                    // Wait for all promises to resolve
                    await Promise.all(filePromises);
                    
                    section_values.push({ id: field.id, val: filesToSend, type: 'file' });
                }
            }
    
            values.push(section_values);
        }
    
        return { id: this.id, values: values, type: 'repeatable' };
    }
}

export class MultiField extends Question {
    constructor(obj) {
        super(obj);
        this.questions = this.container.querySelectorAll('ul li');
        this.fields = this.initializeFields();
    }

    initializeFields() {
        const fields = [];
        this.questions.forEach(question => {
            const id = question.getAttribute('subquestion_id');
            const input = question.querySelector('input');
            const type = input.getAttribute("type");
            const fieldObj = { id, type, input, status: false };

            if (type === "text") {
                input.addEventListener('blur', this.handleOnBlur.bind(this, fieldObj));
            } else if (type === "file") {
                input.addEventListener('change', this.handleOnChange.bind(this, fieldObj));
            }

            fields.push(fieldObj);
        });
        return fields;
    }

    validateText(field) {
        return field.input.value.trim() !== '';
    }

    validateFile(field) {
        return field.input.files.length > 0;
    }

    validateField(field) {
        if (field.type === 'text') {
            return this.validateText(field);
        } else if (field.type === 'file') {
            return this.validateFile(field);
        }
        return true; // Default to true for other types
    }

    areFieldsValid() {
        const allValid = this.fields.every(field => field.status === true);
        this.emitValidStatusToTopLevel(this.id, allValid);
    }

    handleOnBlur(field) {
        const validated = this.validateField(field);
        field.status = validated;
        this.areFieldsValid();
    }

    handleOnChange(field) {
        const validated = this.validateField(field);
        field.status = validated;
        field.input.setAttribute("amount_of_files", field.input.files.length)
        this.areFieldsValid();
    }
    async getValue() {
        const values = [];
        const fileUploadPromises = [];
    
        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
    
            if (field.type === 'text') {
                values.push({ id: field.id, val: field.input.value, type: 'text' });
            } else if (field.type === 'file') {
                // Create a promise for each file upload
                const uploadPromise = send(field.input.files[0]); // Assuming you are uploading only one file per field
                fileUploadPromises.push(uploadPromise);
                console.log(field)
                const uploadedFiles = await Promise.all(fileUploadPromises);
                // Push a placeholder value into the values array (you can replace this with a loading message or something appropriate)
                values.push({ id: field.id, val: uploadedFiles, type: 'file' });
            }
        }
    
        
    
        // Replace the placeholder values in the values array with the uploaded file URLs
        for (let i = 0; i < values.length; i++) {
            if (values[i].type === 'file') {
                values[i].val = uploadedFiles.shift();
            }
        }
    
        return { id: this.id, values: values, type: 'multifield' };
    }
    
}


