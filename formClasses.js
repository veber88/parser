class InputControl {
  constructor(id, isDisabled, isRequired) {
    this.input = document.getElementById(id);
    this.required = isRequired;
    this.input.required = isRequired || false;
    this.input.disabled = isDisabled;
  }

  enable() {
    this.input.disabled = false;
    this.input.required = this.required;

  }

  disable() {
    this.input.disabled = true;
    this.input.required = false;
  }

  getValue() {
    return this.input.value;
  }

  setOptions(arr) {
    this.input.options.length = 0;
    arr.forEach((option, i) => {
      if (option.trim()) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = option;
        this.input.appendChild(opt)
      }
    });
    this.input.value = null;
  }
}

class KeywordTextArea extends InputControl {
  constructor(id, isDisabled, isRequired) {
    super(id, isDisabled, isRequired);
    //default words
    $.get('https://gudhub.com/parser/parse_context.txt', (data) => {
      this.defaultKeywords = data.split(',');
    });
  }

  getValue() {
    if (this.input.disabled) {
      return this.defaultKeywords;
    } else {
      return this.input.value.split(',');
    }
  }
}

class KeywordCheckbox {
  constructor(checkboxId, keywordTextArea) {
    this.checkbox = document.getElementById(checkboxId);
    this.checkbox.checked = true;
    this.textArea = keywordTextArea;
    this.checkbox.onchange = () => this.onChange();
  }

  onChange() {
    if (this.checkbox.checked) {
      this.textArea.disable();
    } else {
      this.textArea.enable();
    }
  }
}



class FileInputControl {
  constructor(csvFileInputId, onSelectCallback, onWrongFileSelectedCallbak, errorMsgId, isRequired) {
    this.input = document.getElementById(csvFileInputId);
    this.input.required = isRequired;
    this.input.onchange  = (data) => this.onFileSelect(data, onSelectCallback, onWrongFileSelectedCallbak);
    this.errorElement = document.getElementById(errorMsgId);
  }

  onFileSelect(data, cbSuccess, cbReject) {
    if (data.target.files[0].type == 'text/csv') {
      cbSuccess();
    } else {
      cbReject();
    }
    this.handleFileSelectError(data);
  }

  getColumns() {
    let fReader = new FileReader();

    return new Promise((resolve) => {
      fReader.readAsText(this.input.files[0]);
      fReader.onload = (event) => {
        // this.fileRowsCount = event.target.result.split('\n').length + 1;
        resolve(event.target.result.split('\n')[0].split(','));
      };
    });
  }

  handleFileSelectError(data) {
    if (data.target.files[0].type != 'text/csv') {
      this.errorElement.style.visibility = "visible";
      this.input.value = '';
    } else {
      this.errorElement.style.visibility = "hidden";
    }
  }

  getValue() {
    return this.input.files[0];
  }

  // getLinesCount() {
  //   return this.fileRowsCount;
  // }
}

class KeyWordsControl {
  constructor(textAreaId, checkBoxId) {
    this.keywordTextArea = new KeywordTextArea(textAreaId, true, true);
    this.keywordCheckbox = new KeywordCheckbox(checkBoxId, this.keywordTextArea);
  }

  getValue() {
    return this.keywordTextArea.getValue();
  }
}

class CSVFileControl {
  constructor(csvFileInputId, hostsColumnInputId, phonesColumnInputId, emailsColumnInputId, errorMsgId, isRequired) {
    this.csvFileInput = new FileInputControl(csvFileInputId, this.enableColumns.bind(this), this.disableColumns.bind(this), errorMsgId, isRequired);
    this.hostsColumnInput = new InputControl(hostsColumnInputId, true, isRequired);
    this.phonesColumnInput = new InputControl(phonesColumnInputId, true, isRequired);
    this.emailsColumnInput = new InputControl(emailsColumnInputId, true, isRequired);
  }

  enableColumns() {
    this.csvFileInput.getColumns().then((data) => {
      this.hostsColumnInput.setOptions(data);
      this.phonesColumnInput.setOptions(data);
      this.emailsColumnInput.setOptions(data);
      this.hostsColumnInput.enable();
      this.phonesColumnInput.enable();
      this.emailsColumnInput.enable();
    });
  }

  disableColumns() {
    this.hostsColumnInput.setOptions([]);
    this.phonesColumnInput.setOptions([]);
    this.emailsColumnInput.setOptions([]);
    this.hostsColumnInput.disable();
    this.phonesColumnInput.disable();
    this.emailsColumnInput.disable();
  }

  getFile() {
    return this.csvFileInput.getValue();
  }

  getColumns() {
    return {
      hostsColumn: this.hostsColumnInput.getValue(),
      phonesColumn: this.phonesColumnInput.getValue(),
      emailsColumn: this.emailsColumnInput.getValue(),
    }
  }

  // getLinesCount() {
  //   return this.csvFileInput.getLinesCount();
  // }
}