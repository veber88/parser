const http = require('http');
const parse = require('./parser.js');
const lineCorrection = require('./line_correction.js');
const formidable = require('formidable');
const fs = require('fs');
const EventEmitter = require('events');
const readline = require('readline');
const csvWriter = require('csv-write-stream');
const { spawnSync } = require('child_process');



let filesInProcess = [];


function getColumns(line, columnDelimiter, quote) {
  let inQuote = false;
  return line.split(columnDelimiter).reduce(function(arr, curr) {
    if (!inQuote) {
      if (curr.startsWith(quote) && !curr.endsWith(quote)) {
        inQuote = true;
        arr.push(curr.slice(1));
      } else {
        arr.push(curr);
      }
    } else {
      if (curr.endsWith(quote)) {
        inQuote = false;
        arr[arr.length - 1] = arr[arr.length - 1] + ',' + curr.slice(0, -1);
      } else {
        arr[arr.length - 1] = arr[arr.length - 1] + ',' + curr;
      }
    }
    return arr;
  }, []);
}

function parseLine(line, requestObject, validCsvWriter, parseFailedCsvWriter) {
  let hostRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&/=]*)/igm,
    columns = JSON.parse(requestObject.fields.columns);
  return new Promise((resolve, reject) => {
    line = lineCorrection(line);

    let lineColumns = getColumns(line, ',', '"'), hostsColumnSpecified = true, hosts;

    if ((lineColumns.length - 1 < Number(columns.hostsColumn))) {
      hostsColumnSpecified = false;
    } else {
      hosts = lineColumns[Number(columns.hostsColumn)].match(hostRegex);
    }


    if (hostsColumnSpecified && hosts && hosts.length) {

      return Promise.race([
        parse(hosts, requestObject.fields.keywords.split(',').map((key) => key.trim()), Number(requestObject.fields.depth)),
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject();
          }, 120000 * hosts.length)
        })
      ])
        .then((result) => {
          lineColumns[columns.phonesColumn] = result.phones.join(',');
          lineColumns[columns.emailsColumn] = result.emails.join(',');
          return lineColumns;
        }, () => {
          reject();
          return Promise.reject();
        })
        .then((csvLineInArr) => {
          validCsvWriter.write(csvLineInArr, () => {
            requestObject.linesCompleted++;
            resolve();
          });
        }, () => {
          parseFailedCsvWriter.write(lineColumns, () => {
            requestObject.failed_parsing_count++;
            requestObject.linesCompleted++;
            resolve();
          });
        });
    } else {
      validCsvWriter.write(lineColumns, () => {
        requestObject.linesCompleted++;
        resolve();
      });
    }
  });
}

let emitter = new EventEmitter();
emitter.on('get_next_file', function () {

  if (!filesInProcess.length) return;
  let requestObject = filesInProcess[0];

  let validCsvWriter, parseFailedCsvWriter;

  let csvColsCount;


  const rl = readline.createInterface({
    input: fs.createReadStream(requestObject.full_file.file.path)
  });

  if (!fs.existsSync('../processedFiles')) {
    fs.mkdirSync('../processedFiles');
  }

  let firstLine = true, linesBuffer = [],
    validRowsoutputStreamFile = fs.createWriteStream('../processedFiles/' + requestObject.file + '.temp'),
    parseFailedOutputStreamFile = fs.createWriteStream('../processedFiles/parsing_failed_' + requestObject.file + '.temp');

  rl.on('line', (line) => {
    if (!firstLine) {
      requestObject.linesCount++;
      linesBuffer.push(line);
    } else {
      csvColsCount = getColumns(line, ',', '"').length;
      validCsvWriter = csvWriter({
        headers: getColumns(line, ',', '"'),
        sendHeaders: false,
        separator: ',',
        newline: '\n'
      });
      parseFailedCsvWriter = csvWriter({
        headers: getColumns(line, ',', '"'),
        sendHeaders: false,
        separator: ',',
        newline: '\n'
      });
      validCsvWriter.pipe(validRowsoutputStreamFile);
      parseFailedCsvWriter.pipe(parseFailedOutputStreamFile);
      validCsvWriter.write(getColumns(line, ',', '"'));
      parseFailedCsvWriter.write(getColumns(line, ',', '"'));
      firstLine = false;
    }
  });

  rl.on('close', () => {
    linesBuffer
      .reduce((previousPromise, currentLine) => {
        return previousPromise
          .then(() => parseLine(currentLine, requestObject, validCsvWriter, parseFailedCsvWriter))
          .catch((e) => parseLine(currentLine, requestObject, validCsvWriter, parseFailedCsvWriter));
      }, Promise.resolve())
      .then(() => {
        validRowsoutputStreamFile.end();
        parseFailedOutputStreamFile.end();
        validCsvWriter.end();
        parseFailedCsvWriter.end();
        fs.renameSync('../processedFiles/' + requestObject.file + '.temp', '../processedFiles/' + requestObject.file);
        if (requestObject.failed_parsing_count) {
          fs.renameSync('../processedFiles/parsing_failed_' + requestObject.file + '.temp', '../processedFiles/parsing_failed_' + requestObject.file);
        } else {
          fs.unlinkSync('../processedFiles/parsing_failed_' + requestObject.file + '.temp');
        }
        filesInProcess.splice(filesInProcess.indexOf(requestObject), 1);
        emitter.emit('get_next_file');
      });
  });
});






http.createServer(function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', 'https://gudhub.com');

  switch (request.url) {
    case '/csv-parsing':
      var form = new formidable.IncomingForm();
      form.parse(request, function (err, fields, files) {
        filesInProcess.push({file: files.file.name, linesCompleted: 0, linesCount: 0, failed_parsing_count: 0, fields: fields, full_file: files});
        if (filesInProcess.length == 1) {
          emitter.emit('get_next_file');
        }
        response.end();
      });
      break;

    case '/default-parsing':
      var form = new formidable.IncomingForm();
      form.parse(request, function (err, fields) {
        parse(fields.hosts.split(' '), fields.keywords.split(',').map((key) => key.trim()), Number(fields.depth)).then((result) => {
          response.end(JSON.stringify(result));
        });
      });
      break;

    case '/csv-active-jobs':
      response.end(JSON.stringify(filesInProcess));
      break;

    // case '/subscribe':
    //   response.writeHead(200, {
    //     'Content-Type': 'text/event-stream; charset=utf-8',
    //     'Cache-Control': 'no-cache'
    //   });
    //   // response.setHeader('Access-Control-Allow-Origin', 'https://gudhub.com');
    //   response.end(JSON.stringify(filesInProcess));
    //   break;

    case '/finished-files':
      fs.readdir('../processedFiles', function(err, items) {
        response.end(JSON.stringify(items.filter((filename) => !filename.endsWith('.temp'))));
      });
      break;

    case '/remove-file':
      var form = new formidable.IncomingForm();
      form.parse(request, function (err, fields, files) {
        fs.unlink('../processedFiles/' + fields.filename, function(err) {
          if (err) {
            response.statusCode = 404;
          }
          response.end();
        });
      });
      break;
    default:
  }
}).listen(10000, '127.0.0.1');
