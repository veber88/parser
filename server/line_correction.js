class Line {
  constructor(line) {
    this.line = line;
  }

  getLine() {
    return this.line;
  }

  setLine(newLine) {
    this.line = newLine;
  }

  accept(visitor) {
    visitor.visit(this);
  }
}


class LineVisitor {
  constructor(specsArr) {
    this.specs = this._createComplexSpec(specsArr);
    // return specs.applyRule(lineObj);
    // this.spec = specification;
  }

  visit(line) {
    this.specs.applyRule(line);
  }

  getCorrectedLine(srcLine) {
    this.visit(srcLine);
    return srcLine.getLine();
  }

  _createComplexSpec(specsArr) {
    if (specsArr.length == 1) return specsArr[0];
    if (specsArr.length == 2) {
      return new AndSpec(specsArr[0], specsArr[1]);
    }
    return new AndSpec(specsArr[0], this._createComplexSpec(specsArr.slice(1)));
  }
}

class Spec {
  constructor(regex, replacer) {
    this.regex = regex;
    this.replacer = replacer;
  }

  applyRule(line) {
    line.setLine(line.getLine().replace(this.regex, this.replacer));
  }
}

class AndSpec {
  constructor(firstSpec, secondSpec) {
    this.first = firstSpec;
    this.second = secondSpec;
  }

  applyRule(line) {
    this.first.applyRule(line);
    this.second.applyRule(line);
    return line;
  }
}


function main(line) {
  let lineObj = new Line(line);
  let specs = [
    new Spec(/Location:.*Location:/i, ','),
    new Spec(/,[\s]*llc\.?/i, ' LLC'),
    new Spec(/,[\s]*inc\.?/i, ' Inc.'),
    new Spec(/,[\s]*ltd\.?/i, ' Ltd.'),
    new Spec(/,(".*").*?,/ig, ',$1,'),
    new Spec(/Stone, Pavers & Concrete/i, '"Stone, Pavers & Concrete"'),
    new Spec(/Tile, Stone & Countertops/i, '"Tile, Stone & Countertops"')
  ];
  let visitor = new LineVisitor(specs);
  return visitor.getCorrectedLine(lineObj);
}


module.exports = main;