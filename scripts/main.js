import { Field, Area, MultipleChoice, TrueFalse, MultiField, RepeatableMultiField } from './oop/questionTypes.js';

let currentPage;
let maxPage;
let questionData = new Array();
let questionsToValidateOnPage =  new Array(); // not validated on currentPage
let validatedQuestionOnPage =  new Array(); // validated questions on currentPage
let values = new Map(); // input values

const init = () => {
    const pages = document.querySelectorAll('fieldset');
    questionData = getQuestionData(pages);
    warmup(pages);
    validationPortal();
    delegateButtons()
    activateSubmitButton();
    //test();
}

const test = () => {
   
}

const validationPortal = () => {
    document.addEventListener('questionValidated', (event) => {
        if(event.detail.validationStatus) {
            if(questionsToValidateOnPage.includes(event.detail.questionID)){
                questionsToValidateOnPage = questionsToValidateOnPage.filter((item) => item !== event.detail.questionID);
                validatedQuestionOnPage.push(event.detail.questionID);
            }
        } else if (!event.detail.validationStatus) {
            if(validatedQuestionOnPage.includes(event.detail.questionID)){
                validatedQuestionOnPage = validatedQuestionOnPage.filter((item) => item !== event.detail.questionID)
                questionsToValidateOnPage.push(event.detail.questionID);
            }
        }

        if(questionsToValidateOnPage.length === 0) {
            document.querySelector('button[action="next"]').disabled = false;
        } else {
            document.querySelector('button[action="next"]').disabled = true;
        }
    });
}

const getQuestionData = (pages) => {
    const page_data = new Map();
    pages.forEach((p, index) => {
        const page = new Map();
        const questions_on_page = p.querySelectorAll('.question')
        questions_on_page.forEach(question => {
            const questionData = {
                container: question,
                id: question.getAttribute('question_id'),
                errorField: question.querySelector('.error-message'),
                required: question.hasAttribute('required'),
                repeatable: question.hasAttribute('repeatable')
            }
            let questionObj;
            switch(question.getAttribute('type')) {
                // 3. events and validation toevoegen aan de classes
                case 'field':
                    questionObj = new Field(questionData);
                    break;
                case 'multifield':
                    questionObj = question.hasAttribute('repeatable') ? new RepeatableMultiField(questionData) : new MultiField(questionData)
                    break;
                case 'checkbox':
                    questionObj = new TrueFalse(questionData)
                    break;
                case 'mpc':
                    questionObj = new MultipleChoice(questionData)
                    break;
                case 'area':
                    questionObj = new Area(questionData)
                    break;
            }
            const questionMap = new Map();
            questionMap.set("data", questionData);
            questionMap.set("obj", questionObj);
            page.set(questionData.id, questionMap)
            //2. opslaan van object samen met de bijhorende data (question) in een map per vraag. question_id{data: volledige data, obj: object}
        })
        page_data.set(index, page)
    })
    return page_data;
}

const delegateButtons = () => {
    const buttons = document.querySelectorAll('button.navigation');
  
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = e.target.getAttribute('action');
        
        if (action === 'prev' && !e.target.disabled) {
          switchPageInformation(currentPage, currentPage - 1);
        } else if (action === 'next' && !e.target.disabled) {
          switchPageInformation(currentPage, currentPage + 1);
        } else if (action === 'submit') {
          submitForm();
        }
      });
    });
  };
  

const switchPageInformation = (oldPageId, newPageId) => {
    // nasty fix 93 to hide page 4 if company has office in Belgium
    if(newPageId === 4 && oldPageId === 3) {
        const country = document.querySelector('li[subquestion_id="Q5SUB5"] input').value.trim().toLowerCase();
        if(country === "belgië" ||  country === "belgie" || country === "belgium") {
            newPageId = 5;
        }
    }

    if(newPageId === 4 && oldPageId === 5) {
        const country = document.querySelector('li[subquestion_id="Q5SUB5"] input').value.trim().toLowerCase();
        if(country === "belgië" ||  country === "belgie" || country === "belgium") {
            newPageId = 3;
        }
    }

    // switch page visualy:
    const oldPage = document.querySelector(`fieldset[page_id="${oldPageId}"]`);
    const newPage = document.querySelector(`fieldset[page_id="${newPageId}"]`);

    currentPage = newPageId;

    oldPage.classList.toggle('invisible');
    newPage.classList.toggle('invisible');

    const data = retrievePageInformation(currentPage, "during");
    questionsToValidateOnPage =  data.invalid;
    validatedQuestionOnPage =  data.valid;


    //check to activate the next button
    if(questionsToValidateOnPage.length === 0) {
        document.querySelector('button[action="next"]').disabled = false;
    }

    //check end of form
    if(currentPage === maxPage) {
        document.querySelector('button[action="next"]').disabled = true;
    }

    //check to activate the prev button
    if(currentPage === 1) {
        document.querySelector('button[action="prev"]').disabled = false;
    }
}


const handleFormSubmission = async () => {
    const formPage = document.querySelector('#form')
    const loaderPage = document.querySelector('#loader')
    formPage.classList.toggle('hidden')
    loaderPage.classList.toggle('hidden')
    const formDataObj = {};
    questionData.forEach(question => {
        question.forEach(async quest => { 
            const value = await quest.get('obj').getValue()
            console.log(value)
            if (value.type === 'text' || value.type === 'true/false' || value.type === 'mpc') {
                formDataObj[value.id] = value.value
            } else if (value.type === 'multifield') {
                const dataToSend = []
                for (const value of values) {
                    if (value.type === 'text') {
                        dataToSend.push(value)
                    } else if (value.type === 'file') {
                        console.log(value.val)
                    }
                }
            }
        })
    })
    console.log(formDataObj)
}


const activateSubmitButton = () => {
    const termscontainer = document.querySelector('.question.submit');
    const termsCheckbox = document.querySelector('.question.submit input');
    const sbmtbtn = document.querySelector('.submit-button');
    sbmtbtn.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default form submission
        if (termsCheckbox.checked) { // Check if the checkbox is checked
            handleFormSubmission();
        } else {
            alert(termscontainer.querySelector('.error-message span').innerHTML);
        }
    });
}


const warmup = (pages) => {
    currentPage = 1;
    maxPage = pages.length;
    pages.forEach((page, i) => {
        if(i !== currentPage - 1) {
            page.classList.toggle('invisible');
        }
    });
    const data = retrievePageInformation(currentPage, "page_load");
    questionsToValidateOnPage =  data.invalid;
    validatedQuestionOnPage =  data.valid;
    
    //dissable both buttons
    document.querySelectorAll('button.navigation').forEach(btn => btn.disabled = true);
}

const retrievePageInformation = (page_id, timing = "during") => {
    const allQuestionsOnPage = document.querySelector(`.page[page_id="${page_id}"]`).querySelectorAll(".question");
    const toValidate = new Array();
    const validated = new Array();
    allQuestionsOnPage.forEach(question => {
        const question_id = question.getAttribute('question_id');
        if(timing === "page_load") {
            toValidate.push(question_id);
        } else {
            const questionObject = questionData.get(currentPage - 1).get(question_id).get('obj');
            questionObject.required || questionObject.isValid() ? validated.push(question) : toValidate.push.question;
        }
    })
    return {valid: validated, invalid: toValidate}
}



init();