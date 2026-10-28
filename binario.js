"use strict";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const categorySelect = $("#category");
  const subtractionMethodSelect = $("#subtractionMethod");
  const subtractionMethodControl = $("#subtractionMethodControl");
  const logicOperationSelect = $("#logicOperation");
  const logicOperationControl = $("#logicOperationControl");
  const bitLengthSelect = $("#bitLength");
  const generateButton = $("#generateBtn");
  const checkButton = $("#checkBtn");
  const answerInput = $("#answerInput");
  const exerciseType = $("#exerciseType");
  const exerciseCounter = $("#exerciseCounter");
  const exerciseTitle = $("#exerciseTitle");
  const problemBox = $("#problemBox");
  const bitPositionPanel = $("#bitPositionPanel");
  const exerciseCheat = $("#exerciseCheat");
  const exerciseCheatTitle = $("#exerciseCheatTitle");
  const exerciseCheatContent = $("#exerciseCheatContent");
  const feedback = $("#feedback");
  const solution = $("#solution");
  const exerciseTip = $("#exerciseTip");
  const calculatorDisplay = $("#calculatorDisplay");
  const calculatorStatus = $("#calculatorStatus");
  const calculatorKeys = document.querySelectorAll(".calc-key");

  let currentExercise = null;
  let exerciseNumber = 0;

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomBits = (width) => Array.from({ length: width }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
  const toBits = (number, width) => number.toString(2).padStart(width, "0");
  const binaryValue = (bits) => parseInt(bits, 2);
  const formatDecimal = (number) => Number(number.toFixed(8)).toString().replace(".", ",");
  const baseNames = { 2: "binario", 8: "octal", 10: "decimal", 16: "hexadecimal" };
  const baseSubscripts = { 2: "₂", 8: "₈", 10: "₁₀", 16: "₁₆" };
  const toBaseDigits = (value, base) => value.toString(base).toUpperCase();

  function repeatedDivisionSteps(value, base) {
    if (value === 0) return "0 ÷ " + base + " = 0, resto 0";
    const steps = [];
    let remainderValue = value;
    while (remainderValue > 0) {
      const quotient = Math.floor(remainderValue / base);
      const remainder = remainderValue % base;
      steps.push(remainderValue + " ÷ " + base + " = " + quotient + ", resto " + toBaseDigits(remainder, base));
      remainderValue = quotient;
    }
    return steps.join("; ");
  }

  function positionalValueSteps(digits, base) {
    return digits.split("").map((digit, index) => {
      const exponent = digits.length - index - 1;
      return digit.toUpperCase() + " × " + base + "^" + exponent;
    }).join(" + ");
  }

  function normalizeBaseAnswer(value) {
    return cleanInput(value).replace(/_/g, "").toLowerCase().replace(/^0+(?=.)/, "");
  }

  function verticalBinaryProblem(a, b, operator) {
    return { left: a, right: b, operator };
  }

  function renderProblem(exercise) {
    problemBox.replaceChildren();
    problemBox.classList.toggle("problem-box-operation", Boolean(exercise.verticalOperation));
    if (!exercise.verticalOperation) {
      problemBox.textContent = exercise.problem;
      return;
    }

    const { left, right, operator } = exercise.verticalOperation;
    const operation = document.createElement("div");
    operation.className = "vertical-operation";
    operation.style.setProperty("--bit-count", String(Math.max(left.length, right.length)));
    operation.setAttribute("role", "img");
    operation.setAttribute("aria-label", left + " " + (operator === "+" ? "más" : "menos") + " " + right + ", resultado por calcular");

    const addCell = (value, row, column, className) => {
      const cell = document.createElement("span");
      cell.className = className;
      cell.textContent = value;
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(column);
      operation.appendChild(cell);
    };

    const bitCount = Math.max(left.length, right.length);
    const paddedLeft = left.padStart(bitCount, "0");
    const paddedRight = right.padStart(bitCount, "0");
    paddedLeft.split("").forEach((bit, index) => addCell(bit, 1, index + 2, "operation-bit"));
    addCell(operator, 2, 1, "operation-sign");
    paddedRight.split("").forEach((bit, index) => addCell(bit, 2, index + 2, "operation-bit"));

    const rule = document.createElement("span");
    rule.className = "operation-rule";
    rule.style.gridRow = "3";
    rule.style.gridColumn = "2 / -1";
    operation.appendChild(rule);

    const question = document.createElement("span");
    question.className = "operation-question";
    question.textContent = "?";
    question.style.gridRow = "4";
    question.style.gridColumn = "2 / -1";
    operation.appendChild(question);
    problemBox.appendChild(operation);
    if (exercise.stepLabel) {
      const stepLabel = document.createElement("span");
      stepLabel.className = "operation-step-label";
      stepLabel.textContent = exercise.stepLabel;
      problemBox.appendChild(stepLabel);
    }
  }

  function cleanInput(value) {
    return value.trim()
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, "")
      .replace(/\s+/g, "")
      .replace(/[‐‑‒–—−]/g, "-")
      .replace(",", ".");
  }

  function cleanBinary(value) {
    return cleanInput(value).replace(/_/g, "").replace(/^(-?)0+(?=[01])/, "$1");
  }

  function binaryFractionToDecimal(bits) {
    const parts = bits.replace(",", ".").split(".");
    const integer = parseInt(parts[0] || "0", 2);
    const fraction = (parts[1] || "").split("").reduce((sum, bit, index) => {
      return sum + (bit === "1" ? Math.pow(2, -(index + 1)) : 0);
    }, 0);
    return integer + fraction;
  }

  function decimalFractionToBinary(value, maxPlaces = 8) {
    const parts = String(value).replace(",", ".").split(".");
    let integer = Number(parts[0]);
    let fraction = Number("0." + (parts[1] || "0"));
    let whole = integer.toString(2);
    let fractional = "";
    for (let i = 0; i < maxPlaces && fraction > 0.000000001; i += 1) {
      fraction *= 2;
      if (fraction >= 1) {
        fractional += "1";
        fraction -= 1;
      } else {
        fractional += "0";
      }
    }
    fractional = fractional.replace(/0+$/, "");
    return fractional ? whole + "," + fractional : whole;
  }

  function addBinary(a, b, width) {
    const sum = binaryValue(a) + binaryValue(b);
    return {
      bits: sum.toString(2).padStart(width + (sum >= Math.pow(2, width) ? 1 : 0), "0"),
      decimal: sum
    };
  }

  function complementSubtract(a, b, width, method) {
    const mask = Math.pow(2, width) - 1;
    let rawSum;
    let finalBits;
    let explanation;

    const resultValue = binaryValue(a) - binaryValue(b);

    if (method === "C1") {
      const inverse = toBits(mask ^ binaryValue(b), width);
      rawSum = binaryValue(a) + binaryValue(inverse);
      if (resultValue === 0) {
        finalBits = toBits(0, width);
        explanation = "C1 de B: " + inverse + ". La suma da " + toBits(rawSum, width) +
          " (cero negativo en C1); se normaliza como cero positivo: " + finalBits + ".";
      } else if (rawSum >= Math.pow(2, width)) {
        finalBits = toBits((rawSum & mask) + 1, width);
        explanation = "C1 de B: " + inverse + ". Suma A + C1(B) = " + rawSum.toString(2) +
          " (acarreo final). Reincorpora el acarreo: resultado " + finalBits + ".";
      } else {
        finalBits = toBits(rawSum, width);
        const magnitude = toBits((~rawSum) & mask, width);
        explanation = "C1 de B: " + inverse + ". Suma A + C1(B) = " + finalBits +
          " sin acarreo final. El resultado es negativo en C1; invierte " + finalBits +
          " y obtienes la magnitud " + magnitude + " = " + Math.abs(resultValue) + ".";
      }
    } else {
      const inverse = toBits(mask ^ binaryValue(b), width);
      const c2 = toBits((binaryValue(inverse) + 1) & mask, width);
      rawSum = binaryValue(a) + binaryValue(c2);
      finalBits = toBits(rawSum & mask, width);
      explanation = "C1 de B: " + inverse + "; suma 1 para obtener C2(B) = " + c2 +
        ". Suma A + C2(B) y descarta el acarreo final: resultado " + finalBits + "." +
        (resultValue < 0 ? " Para interpretar el resultado negativo, invierte " + finalBits +
          " y suma 1: la magnitud es " + toBits(-resultValue, width) + "." : "");
    }

    return { bits: finalBits, value: resultValue, explanation };
  }

  function pickType(category) {
    if (category !== "mixed") return category;
    const options = ["conversion", "fraction", "addition", "subtraction", "logic", "parity"];
    return options[randomInt(0, options.length - 1)];
  }

  function makeExercise() {
    const width = Number(bitLengthSelect.value);
    const category = pickType(categorySelect.value);

    if (category === "conversion") {
      const bases = [2, 8, 10, 16];
      const sourceBase = bases[randomInt(0, bases.length - 1)];
      const targetChoices = bases.filter((base) => base !== sourceBase);
      const targetBase = targetChoices[randomInt(0, targetChoices.length - 1)];
      const value = randomInt(0, Math.pow(2, width) - 1);
      const sourceDigits = sourceBase === 2 ? toBits(value, width) : toBaseDigits(value, sourceBase);
      const answer = targetBase === 2 ? toBits(value, width) : toBaseDigits(value, targetBase);
      let explanation;

      if (sourceBase === 2 && (targetBase === 8 || targetBase === 16)) {
        const groupSize = targetBase === 8 ? 3 : 4;
        const paddedBits = sourceDigits.padStart(Math.ceil(sourceDigits.length / groupSize) * groupSize, "0");
        const groups = paddedBits.match(new RegExp(".{1," + groupSize + "}", "g")) || [];
        explanation = "Agrupa los bits desde la derecha de " + groupSize + " en " + groupSize + ": " +
          groups.join(" ") + ". Cada grupo equivale a un dígito " + baseNames[targetBase] + ". " +
          groups.map((group) => group + "₂ = " + toBaseDigits(parseInt(group, 2), targetBase)).join("; ") +
          ". Resultado: " + answer + baseSubscripts[targetBase] + ".";
      } else if ((sourceBase === 8 || sourceBase === 16) && targetBase === 2) {
        const groupSize = sourceBase === 8 ? 3 : 4;
        const expanded = sourceDigits.split("").map((digit) =>
          parseInt(digit, sourceBase).toString(2).padStart(groupSize, "0")
        ).join(" ");
        explanation = "Cambia cada dígito " + baseNames[sourceBase] + " por su grupo de " + groupSize +
          " bits: " + expanded + ". Junta los grupos y conserva los ceros que necesites para completar " +
          width + " bits: " + answer + ".";
      } else if (targetBase === 10) {
        explanation = positionalValueSteps(sourceDigits, sourceBase) + " = " + value +
          ". Por tanto, el resultado en decimal es " + answer + ".";
      } else if (sourceBase === 10) {
        explanation = "Divide entre " + targetBase + " y lee los restos desde el último hasta el primero: " +
          repeatedDivisionSteps(value, targetBase) + ". Resultado: " + answer + baseSubscripts[targetBase] + ".";
      } else {
        explanation = positionalValueSteps(sourceDigits, sourceBase) + " = " + value +
          " en decimal. Después, divide entre " + targetBase + " y lee los restos al revés: " +
          repeatedDivisionSteps(value, targetBase) + ". Resultado: " + answer + baseSubscripts[targetBase] + ".";
      }

      return {
        type: "CONVERSIÓN · " + baseNames[sourceBase].toUpperCase() + " A " + baseNames[targetBase].toUpperCase(),
        title: "Pasa este número a " + baseNames[targetBase],
        problem: sourceDigits + baseSubscripts[sourceBase] + " = ?" + baseSubscripts[targetBase],
        answer,
        answerBase: targetBase,
        conversionFrom: sourceBase,
        conversionTo: targetBase,
        bitPanel: sourceBase === 2 || targetBase === 2
          ? { bits: sourceBase === 2 ? sourceDigits : null, width }
          : null,
        cheatType: "conversion",
        mode: targetBase === 10 ? "decimal" : targetBase === 2 ? "binary" : "base",
        explanation,
        tip: targetBase === 8 && sourceBase === 2 ? "Para octal, separa el binario en grupos de 3 bits empezando desde la derecha." :
          targetBase === 16 && sourceBase === 2 ? "Para hexadecimal, separa el binario en grupos de 4 bits empezando desde la derecha." :
            targetBase === 2 && (sourceBase === 8 || sourceBase === 16) ? "Sustituye cada dígito por su grupo de 3 bits (octal) o 4 bits (hexadecimal)." :
              "Usa las divisiones entre la base de destino o el valor posicional de la base de origen."
      };
    }

    if (category === "fraction") {
      if (Math.random() < 0.5) {
        const whole = randomInt(0, Math.min(12, Math.pow(2, width) - 1));
        const places = randomInt(1, 4);
        const fractionBits = randomBits(places);
        const binary = whole.toString(2) + "," + fractionBits;
        const result = binaryFractionToDecimal(binary);
        return {
          type: "FRACCIÓN · BINARIO A DECIMAL",
          title: "Convierte la parte fraccionaria",
          problem: binary + "₂ = ?₁₀",
          answer: String(result),
          mode: "decimal",
          tolerance: 0.000001,
          bitPanel: { integerBits: whole.toString(2), width, fractionBits, fractionWidth: places },
          cheatType: "fraction",
          explanation: binary.split(",")[0] + "₂ = " + parseInt(whole.toString(2), 2) +
            "; " + fractionBits.split("").map((bit, index) => bit + " × 2^−" + (index + 1)).join(" + ") +
            ". Total: " + formatDecimal(result) + ".",
          tip: "A la derecha de la coma: 2⁻¹ = 0,5; 2⁻² = 0,25; 2⁻³ = 0,125…"
        };
      }
      const whole = randomInt(0, Math.min(12, Math.pow(2, width) - 1));
      const fraction = randomInt(1, 15) / 16;
      const value = whole + fraction;
      const result = decimalFractionToBinary(value, 8);
      return {
        type: "FRACCIÓN · DECIMAL A BINARIO",
        title: "Convierte este decimal a binario",
        problem: formatDecimal(value) + "₁₀ = ?₂",
        answer: result,
        mode: "binary",
        bitPanel: { integerBits: null, width, fractionBits: null, fractionWidth: 4 },
        cheatType: "fraction",
        explanation: "Convierte la parte entera por divisiones sucesivas. Multiplica la fracción por 2 y toma cada parte entera en orden. Resultado: " + result + "₂.",
        tip: "Multiplica la fracción por 2 repetidamente. Lee las partes enteras en el orden en que aparecen."
      };
    }

    if (category === "arithmetic" || category === "addition") {
      const a = randomInt(0, Math.pow(2, width) - 1);
      const b = randomInt(0, Math.pow(2, width) - 1);
      const bitsA = toBits(a, width);
      const bitsB = toBits(b, width);
      const isAddition = category === "addition" ? true : category === "subtraction" ? false : Math.random() < 0.5;
      if (isAddition) {
        const result = addBinary(bitsA, bitsB, width);
        return {
          type: "ARITMÉTICA · SUMA BINARIA",
          title: "Suma las dos secuencias",
          verticalOperation: verticalBinaryProblem(bitsA, bitsB, "+"),
          answer: result.bits,
          mode: "binary",
          cheatType: "addition",
          explanation: a + " + " + b + " = " + result.decimal + ". En binario, " + result.bits + ". El acarreo puede añadir un bit.",
          tip: "En cada columna, 1 + 1 = 10: escribe 0 y acarrea 1."
        };
      }
      const minuend = Math.random() < 0.5 ? a : b;
      const subtrahend = minuend === a ? b : a;
      const diff = minuend - subtrahend;
      const resultMagnitude = Math.abs(diff).toString(2).padStart(width, "0");
      const resultBits = diff < 0 ? "-" + resultMagnitude : resultMagnitude;
      return {
        type: "ARITMÉTICA · RESTA BINARIA",
        title: "Resuelve la resta directa",
        verticalOperation: verticalBinaryProblem(toBits(minuend, width), toBits(subtrahend, width), "−"),
        answer: resultBits,
        mode: "binary",
        cheatType: "subtraction",
        explanation: minuend + " − " + subtrahend + " = " + diff + ". " +
          (diff < 0 ? "Escribe el signo menos y convierte la magnitud " + Math.abs(diff) + " a binario." :
            "Comprueba el resultado convirtiéndolo a decimal: " + resultBits + "₂ = " + diff + "."),
        tip: "Si el minuendo es menor, expresa el resultado con signo negativo y convierte su magnitud."
      };
    }

    if (category === "subtraction" || category === "complement" || category === "complement1" || category === "complement2") {
      const method = category === "subtraction" ? subtractionMethodSelect.value :
        category === "complement1" ? "C1" : category === "complement2" ? "C2" :
          Math.random() < 0.5 ? "C1" : "C2";
      const operandMax = method === "normal" ? Math.pow(2, width) - 1 : Math.pow(2, width - 1) - 1;
      const a = randomInt(0, operandMax);
      const b = randomInt(0, operandMax);

      if (method === "normal") {
        const minuend = Math.random() < 0.5 ? a : b;
        const subtrahend = minuend === a ? b : a;
        const difference = minuend - subtrahend;
        const resultMagnitude = Math.abs(difference).toString(2).padStart(width, "0");
        const answer = difference < 0 ? "-" + resultMagnitude : resultMagnitude;
        return {
          type: "ARITMÉTICA · RESTA NORMAL",
          title: "Resuelve la resta binaria",
          verticalOperation: verticalBinaryProblem(toBits(minuend, width), toBits(subtrahend, width), "−"),
          answer,
          mode: "binary",
          cheatType: "subtraction",
          explanation: minuend + " − " + subtrahend + " = " + difference + ". " +
            (difference < 0 ? "El resultado es negativo; convierte la magnitud " + Math.abs(difference) + " a binario y escribe el signo menos." :
              "El resultado decimal " + difference + " escrito en binario es " + answer + "."),
          tip: "Resta desde la derecha. Si aparece 0 − 1, pide prestado a una columna de la izquierda."
        };
      }

      const result = complementSubtract(toBits(a, width), toBits(b, width), width, method);
      const bitsA = toBits(a, width);
      const bitsB = toBits(b, width);
      const inverseBits = toBits(Math.pow(2, width) - 1 - b, width);
      const steps = [{
        title: "Resta usando " + (method === "C1" ? "complemento a 1" : "complemento a 2"),
        verticalOperation: verticalBinaryProblem(bitsA, bitsB, "−"),
        stepLabel: "Inversión del sustraendo:",
        answer: inverseBits,
        mode: "binary",
        answerPlaceholder: "Escribe la inversión del sustraendo",
        tip: "Cambia todos los 0 por 1 y todos los 1 por 0. Conserva exactamente " + width + " bits."
      }];

      if (method === "C1") {
        const rawSum = a + binaryValue(inverseBits);
        const lowBits = toBits(rawSum & (Math.pow(2, width) - 1), width);
        steps.push({
          title: "Paso 2: suma A + C1(B)",
          verticalOperation: verticalBinaryProblem(bitsA, inverseBits, "+"),
          answer: rawSum.toString(2),
          mode: "binary",
          tip: "Escribe el resultado completo, incluido el acarreo que pueda salir por la izquierda."
        });
        if (result.value === 0) {
          steps.push({
            title: "Paso 3: normaliza el cero",
            problem: lowBits + "₂ es el cero negativo de C1. Escribe el cero positivo con " + width + " bits.",
            answer: toBits(0, width),
            mode: "binary",
            tip: "En complemento a 1 se puede formar un cero negativo; para la respuesta final usa todo ceros."
          });
        } else if (rawSum >= Math.pow(2, width)) {
          steps.push({
            title: "Paso 3: reincorpora el acarreo final",
            verticalOperation: verticalBinaryProblem(lowBits, toBits(1, width), "+"),
            answer: result.bits,
            mode: "binary",
            tip: "Suma el acarreo 1 al bit de más a la derecha (acarreo recurrente)."
          });
        }
      } else {
        const c2Bits = toBits((binaryValue(inverseBits) + 1) & (Math.pow(2, width) - 1), width);
        steps.push({
          title: "Paso 2: calcula C2(B) sumando 1",
          verticalOperation: verticalBinaryProblem(inverseBits, toBits(1, width), "+"),
          stepLabel: "Suma C1(B) + 1 para obtener C2(B):",
          answer: c2Bits,
          mode: "binary",
          answerPlaceholder: "Escribe el resultado de C1(B) + 1",
          tip: "El 1 va en la columna de la derecha; los ceros de la izquierda completan el ancho. Si aparece un bit extra, descártalo."
        });
        steps.push({
          title: "Paso 3: suma A + C2(B)",
          verticalOperation: verticalBinaryProblem(bitsA, c2Bits, "+"),
          answer: result.bits,
          mode: "binary",
          tip: "Suma columna a columna. Conserva los " + width + " bits de la derecha y descarta cualquier acarreo final."
        });
      }
      return {
        type: "RESTA · " + (method === "C1" ? "COMPLEMENTO A 1" : "COMPLEMENTO A 2"),
        title: "Resta usando " + (method === "C1" ? "complemento a 1" : "complemento a 2"),
        verticalOperation: verticalBinaryProblem(toBits(a, width), toBits(b, width), "−"),
        answer: result.bits,
        mode: "binary",
        cheatType: method,
        steps,
        explanation: result.explanation + " Valor decimal: " + result.value + ".",
        tip: method === "C1" ? "Invierte los bits del sustraendo; si sobra un acarreo por la izquierda, súmalo a la derecha." : "Invierte el sustraendo, suma 1 y descarta el acarreo final."
      };
    }
    if (category === "parity") {
      const parityMode = Math.random() < 0.5 ? "even" : "odd";
      const modeLabel = parityMode === "even" ? "paridad par" : "paridad impar";
      const verify = Math.random() < 0.5;
      if (!verify) {
        const bits = randomBits(width);
        const ones = bits.split("").filter((bit) => bit === "1").length;
        const parityBit = parityMode === "even" ? String(ones % 2) : String((ones + 1) % 2);
        return {
          type: "PARIDAD · " + modeLabel.toUpperCase(),
          title: "Calcula el bit de " + modeLabel,
          problem: "Añade el bit de " + modeLabel + " a " + bits + "₂. ¿Qué bit falta?",
          answer: parityBit,
          mode: "binary",
          cheatType: "parity",
          parityMode,
          parityTask: "create",
          explanation: "La secuencia tiene " + ones + " unos. " +
            (parityMode === "even" ? "Para que el total sea par, " : "Para que el total sea impar, ") +
            "el bit que falta es " + parityBit + ".",
          tip: "Cuenta los unos de la secuencia. El bit añadido debe dejar el total par o impar, según indique el ejercicio."
        };
      }

      const bits = randomBits(width + 1);
      const ones = bits.split("").filter((bit) => bit === "1").length;
      const valid = parityMode === "even" ? ones % 2 === 0 : ones % 2 === 1;
      return {
        type: "PARIDAD · COMPROBACIÓN " + modeLabel.toUpperCase(),
        title: "Comprueba la paridad",
        problem: "¿La secuencia " + bits + "₂ cumple " + modeLabel + "? Responde sí o no.",
        answer: valid ? "sí" : "no",
        mode: "text",
        cheatType: "parity",
        parityMode,
        parityTask: "check",
        explanation: "La secuencia contiene " + ones + " unos, así que su total es " +
          (ones % 2 === 0 ? "par" : "impar") + ". " +
          (valid ? "Sí cumple " + modeLabel + "." : "No cumple " + modeLabel + "."),
        tip: "Cuenta todos los unos, incluido el bit de paridad que ya forma parte de la secuencia."
      };
    }
    const operations = ["AND", "OR", "NAND", "NOR", "XOR", "NOT"];
    const op = category === "logic" ? logicOperationSelect.value : operations[randomInt(0, operations.length - 1)];
    const a = randomBits(width);
    const b = randomBits(width);
    const result = a.split("").map((bit, index) => {
      const left = bit === "1";
      if (op === "NOT") return left ? "0" : "1";
      const right = b[index] === "1";
      let output;
      if (op === "AND" || op === "NAND") output = left && right;
      if (op === "OR" || op === "NOR") output = left || right;
      if (op === "XOR") output = left !== right;
      if (op === "NAND" || op === "NOR") output = !output;
      return output ? "1" : "0";
    }).join("");
    return {
      type: "LÓGICA · PUERTA " + op,
      title: "Opera bit a bit con " + op,
      problem: op === "NOT" ? "NOT " + a + "₂ = ?₂" : a + "₂ " + op + " " + b + "₂ = ?₂",
      answer: result,
      mode: "binary",
      cheatType: "logic",
      logicOperation: op,
      explanation: op === "NOT" ? "NOT invierte cada bit: " + a + " → " + result + "." :
        "Compara las parejas en cada posición según la tabla de " + op + ": " + result + ".",
      tip: op === "XOR" ? "XOR vale 1 cuando los bits de esa columna son distintos." :
        op === "NAND" || op === "NOR" ? op + " invierte el resultado de " + (op === "NAND" ? "AND" : "OR") + "." :
          op === "AND" ? "AND solo vale 1 cuando ambos bits de la posición valen 1." :
            op === "OR" ? "OR vale 1 si al menos uno de los dos bits vale 1." : "NOT cambia cada 0 por 1 y cada 1 por 0."
    };
  }

  function renderBitPositionPanel(panel) {
    bitPositionPanel.replaceChildren();
    bitPositionPanel.hidden = !panel;
    if (!panel) return;

    const heading = document.createElement("div");
    heading.className = "bit-panel-heading";
    heading.innerHTML = "<span>CHULETA DE POSICIONES</span><span>bit · potencia de 2 · valor decimal</span>";
    bitPositionPanel.appendChild(heading);

    const fractional = panel.fractionWidth !== undefined;
    const fractionWidth = fractional ? panel.fractionWidth : 0;
    const columnCount = panel.width + (fractional ? fractionWidth + 1 : 0);
    const grid = document.createElement("div");
    grid.className = "bit-position-grid";
    grid.style.gridTemplateColumns = "repeat(" + panel.width + ", minmax(42px, 1fr))" +
      (fractional ? " 12px repeat(" + fractionWidth + ", minmax(42px, 1fr))" : "");
    grid.setAttribute("aria-colcount", String(columnCount));

    const integerBits = panel.integerBits !== undefined ? panel.integerBits : panel.bits;
    const integerDisplay = integerBits === null ? null : String(integerBits).padStart(panel.width, "0").slice(-panel.width);

    function appendCell(bit, exponent) {
      const card = document.createElement("div");
      card.className = "bit-position-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", "Bit " + (bit === null ? "por resolver" : bit) +
        ", potencia 2 elevado a " + exponent + ", peso " + formatDecimal(Math.pow(2, exponent)));

      const bitValue = document.createElement("strong");
      bitValue.className = "position-bit";
      bitValue.textContent = bit === null ? "?" : bit;

      const power = document.createElement("span");
      power.className = "position-power";
      power.append("2");
      const superscript = document.createElement("sup");
      superscript.textContent = String(exponent);
      power.appendChild(superscript);

      const weight = document.createElement("span");
      weight.className = "position-value";
      weight.textContent = formatDecimal(Math.pow(2, exponent));

      card.append(bitValue, power, weight);
      grid.appendChild(card);
    }

    for (let index = 0; index < panel.width; index += 1) {
      appendCell(integerDisplay === null ? null : integerDisplay[index], panel.width - index - 1);
    }

    if (fractional) {
      const separator = document.createElement("span");
      separator.className = "bit-separator";
      separator.textContent = ",";
      separator.setAttribute("aria-hidden", "true");
      grid.appendChild(separator);
      for (let index = 0; index < fractionWidth; index += 1) {
        const bit = panel.fractionBits === null ? null : panel.fractionBits[index];
        appendCell(bit === undefined ? "0" : bit, -(index + 1));
      }
    }

    bitPositionPanel.appendChild(grid);
  }

  function appendCheatParagraph(container, text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    container.appendChild(paragraph);
  }

  function appendCheatTable(container, headers, rows) {
    const table = document.createElement("table");
    table.className = "cheat-rule-table";
    const head = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    container.appendChild(table);
  }

  function renderExerciseCheat(exercise) {
    exerciseCheat.hidden = false;
    exerciseCheatContent.replaceChildren();

    if (exercise.cheatType === "conversion") {
      const from = exercise.conversionFrom;
      const to = exercise.conversionTo;
      exerciseCheatTitle.textContent = "Chuleta · conversión entre bases";
      appendCheatParagraph(exerciseCheatContent, "En cualquier base, cada posición vale una potencia de la base: por ejemplo, en octal son potencias de 8 y en hexadecimal, potencias de 16.");
      if (from === 2 && to === 8 || from === 8 && to === 2) {
        appendCheatTable(exerciseCheatContent, ["Binario", "Octal"], Array.from({ length: 8 }, (_, value) => [value.toString(2).padStart(3, "0"), String(value)]));
        appendCheatParagraph(exerciseCheatContent, "Agrupa o sustituye los bits de 3 en 3. Completa con ceros a la izquierda si hace falta.");
      } else if (from === 2 && to === 16 || from === 16 && to === 2) {
        appendCheatTable(exerciseCheatContent, ["Binario", "Hexadecimal"], Array.from({ length: 16 }, (_, value) => [value.toString(2).padStart(4, "0"), value.toString(16).toUpperCase()]));
        appendCheatParagraph(exerciseCheatContent, "Agrupa o sustituye los bits de 4 en 4. En hexadecimal, A=10, B=11, C=12, D=13, E=14 y F=15.");
      } else if (to === 10) {
        appendCheatParagraph(exerciseCheatContent, "Multiplica cada dígito por la potencia de la base que le corresponde y suma. Las posiciones se cuentan desde la derecha empezando por 0.");
      } else if (from === 10) {
        appendCheatParagraph(exerciseCheatContent, "Divide el número decimal entre la base de destino. Repite con cada cociente y lee los restos desde el último hasta el primero.");
      } else {
        appendCheatParagraph(exerciseCheatContent, "Primero convierte el número de origen a decimal usando sus potencias posicionales. Después divide ese decimal entre la base de destino y lee los restos al revés.");
        if (from === 16 || to === 16) appendCheatParagraph(exerciseCheatContent, "En hexadecimal, A=10, B=11, C=12, D=13, E=14 y F=15.");
      }
      return;
    }

    if (exercise.cheatType === "fraction") {
      exerciseCheatTitle.textContent = "Chuleta · conversión de fracciones";
      appendCheatParagraph(exerciseCheatContent, "A la izquierda de la coma, las posiciones valen 2⁰, 2¹, 2²… A la derecha valen 2⁻¹ = 0,5; 2⁻² = 0,25; 2⁻³ = 0,125… El panel muestra cada peso.");
      appendCheatParagraph(exerciseCheatContent, "De decimal a binario: convierte la parte entera dividiendo entre 2. Multiplica la fracción por 2 y anota cada parte entera en orden.");
      return;
    }

    if (exercise.cheatType === "addition") {
      exerciseCheatTitle.textContent = "Chuleta · suma binaria";
      appendCheatTable(exerciseCheatContent, ["Operación", "Escribe", "Acarreo"], [
        ["0 + 0", "0", "0"], ["0 + 1", "1", "0"], ["1 + 0", "1", "0"],
        ["1 + 1", "0", "1"], ["1 + 1 + 1", "1", "1"]
      ]);
      appendCheatParagraph(exerciseCheatContent, "Suma columna a columna de derecha a izquierda. Añade el acarreo a la columna siguiente.");
      return;
    }

    if (exercise.cheatType === "subtraction") {
      exerciseCheatTitle.textContent = "Chuleta · resta binaria directa";
      appendCheatTable(exerciseCheatContent, ["Operación", "Resultado"], [
        ["0 − 0", "0"], ["1 − 0", "1"], ["1 − 1", "0"], ["0 − 1", "1 y pide 1 prestado"]
      ]);
      appendCheatParagraph(exerciseCheatContent, "Al pedir prestado, el 0 de esa columna pasa a valer 10₂. Entonces 10₂ − 1₂ = 1₂.");
      return;
    }

    if (exercise.cheatType === "C1") {
      exerciseCheatTitle.textContent = "Chuleta · complemento a 1";
      appendCheatParagraph(exerciseCheatContent, "1. Invierte todos los bits del sustraendo. 2. Suma el minuendo y ese sustraendo invertido. 3. Si aparece acarreo final, súmalo al extremo derecho. Si no hay acarreo, el resultado es negativo y queda expresado en C1.");
      return;
    }

    if (exercise.cheatType === "C2") {
      exerciseCheatTitle.textContent = "Chuleta · complemento a 2";
      appendCheatParagraph(exerciseCheatContent, "1. Invierte todos los bits del sustraendo para obtener C1. 2. Suma 1 a C1 para obtener C2. 3. Suma el minuendo y C2; conserva el ancho indicado y descarta el acarreo final.");
      return;
    }

    if (exercise.cheatType === "parity") {
      exerciseCheatTitle.textContent = "Chuleta · paridad par e impar";
      appendCheatTable(exerciseCheatContent, ["Tipo", "Regla"], [
        ["Par", "El total de unos debe ser múltiplo de 2"],
        ["Impar", "El total de unos debe dejar resto 1 al dividir entre 2"]
      ]);
      appendCheatParagraph(exerciseCheatContent, "Cuenta los bits que valen 1, incluido el bit de paridad cuando la secuencia ya lo contiene. Si falta el bit, elige 0 o 1 para que el total cumpla la regla.");
      return;
    }

    if (exercise.cheatType === "logic") {
      const op = exercise.logicOperation;
      exerciseCheatTitle.textContent = "Chuleta · puerta " + op;
      if (op === "NOT") {
        appendCheatTable(exerciseCheatContent, ["Entrada", "NOT"], [["0", "1"], ["1", "0"]]);
        appendCheatParagraph(exerciseCheatContent, "NOT invierte cada bit de la secuencia.");
        return;
      }
      const outputs = {
        AND: ["0", "0", "0", "1"],
        OR: ["0", "1", "1", "1"],
        NAND: ["1", "1", "1", "0"],
        NOR: ["1", "0", "0", "0"],
        XOR: ["0", "1", "1", "0"]
      };
      appendCheatTable(exerciseCheatContent, ["A", "B", op], [
        ["0", "0", outputs[op][0]], ["0", "1", outputs[op][1]],
        ["1", "0", outputs[op][2]], ["1", "1", outputs[op][3]]
      ]);
      const descriptions = {
        AND: "Solo devuelve 1 si ambos bits son 1.",
        OR: "Devuelve 1 si al menos uno de los bits es 1.",
        NAND: "Invierte la salida de AND.",
        NOR: "Invierte la salida de OR.",
        XOR: "Devuelve 1 si los bits son distintos."
      };
      appendCheatParagraph(exerciseCheatContent, descriptions[op]);
    }
  }
  function initializePickers() {
    document.querySelectorAll("[data-picker]").forEach((picker) => {
      const trigger = picker.querySelector(".picker-trigger");
      const menu = picker.querySelector(".picker-menu");
      const nativeSelect = picker.querySelector(".picker-native");
      const currentLabel = picker.querySelector(".picker-current");
      const options = Array.from(picker.querySelectorAll(".picker-option"));
      let menuAnimation = null;

      function closeMenu(restoreFocus = false) {
        if (menu.hidden || trigger.getAttribute("aria-expanded") === "false") return;
        trigger.setAttribute("aria-expanded", "false");
        picker.classList.remove("is-open");
        if (menuAnimation) menuAnimation.cancel();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          menuAnimation = menu.animate(
            [{ opacity: 1, transform: "translateY(0) scaleY(1)" }, { opacity: 0, transform: "translateY(-5px) scaleY(.97)" }],
            { duration: 170, easing: "cubic-bezier(.4,0,.8,.2)" }
          );
          menuAnimation.onfinish = () => {
            if (trigger.getAttribute("aria-expanded") === "false") menu.hidden = true;
            menuAnimation = null;
          };
        } else {
          menu.hidden = true;
        }
        if (restoreFocus) trigger.focus();
      }

      function openMenu() {
        if (trigger.getAttribute("aria-expanded") === "true") return;
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        picker.classList.add("is-open");
        if (menuAnimation) menuAnimation.cancel();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          menuAnimation = menu.animate(
            [{ opacity: 0, transform: "translateY(-6px) scaleY(.96)" }, { opacity: 1, transform: "translateY(0) scaleY(1)" }],
            { duration: 210, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
        }
        const selected = options.find((option) => option.dataset.value === nativeSelect.value);
        (selected || options[0]).focus();
      }

      trigger.addEventListener("click", () => {
        if (trigger.getAttribute("aria-expanded") === "true") closeMenu();
        else openMenu();
      });

      options.forEach((option, index) => {
        option.addEventListener("click", () => {
          nativeSelect.value = option.dataset.value;
          currentLabel.textContent = option.textContent.trim();
          options.forEach((item) => item.setAttribute("aria-selected", String(item === option)));
          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
          closeMenu(true);
        });
        option.addEventListener("keydown", (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            options[(index + direction + options.length) % options.length].focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            options[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            options[options.length - 1].focus();
          } else if (event.key === "Escape") {
            event.preventDefault();
            closeMenu(true);
          }
        });
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMenu();
        }
      });

      document.addEventListener("pointerdown", (event) => {
        if (!picker.contains(event.target)) closeMenu();
      });
    });
  }

  function initializeDisclosureAnimations() {
    document.querySelectorAll("details").forEach((details) => {
      const summary = details.querySelector(":scope > summary");
      if (!summary) return;
      let activeAnimation = null;
      let desiredOpen = details.open;

      summary.addEventListener("click", (event) => {
        event.preventDefault();
        desiredOpen = !desiredOpen;
        if (activeAnimation) activeAnimation.cancel();

        const startHeight = details.getBoundingClientRect().height;
        if (desiredOpen) details.open = true;
        details.style.height = startHeight + "px";
        details.style.overflow = "hidden";
        void details.offsetHeight;

        const endHeight = desiredOpen ? details.scrollHeight : summary.offsetHeight;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          details.open = desiredOpen;
          details.style.removeProperty("height");
          details.style.removeProperty("overflow");
          return;
        }

        activeAnimation = details.animate(
          [{ height: startHeight + "px" }, { height: endHeight + "px" }],
          { duration: 250, easing: "cubic-bezier(.2,.75,.25,1)" }
        );
        activeAnimation.onfinish = () => {
          details.open = desiredOpen;
          details.style.removeProperty("height");
          details.style.removeProperty("overflow");
          activeAnimation = null;
        };
      });
    });
  }

  initializePickers();
  initializeDisclosureAnimations();
  function updateSubtractionMethodVisibility() {
    subtractionMethodControl.hidden = categorySelect.value !== "subtraction";
    logicOperationControl.hidden = categorySelect.value !== "logic";
  }
  categorySelect.addEventListener("change", updateSubtractionMethodVisibility);
  updateSubtractionMethodVisibility();

  function renderExercise() {
    currentExercise = makeExercise();
    currentExercise.stepIndex = 0;
    exerciseNumber += 1;
    exerciseType.textContent = currentExercise.type;
    exerciseCounter.textContent = "RETO " + exerciseNumber;
    const activeContent = currentExercise.steps ? currentExercise.steps[0] : currentExercise;
    exerciseTitle.textContent = activeContent.title || currentExercise.title;
    renderProblem(activeContent);
    renderBitPositionPanel(currentExercise.bitPanel);
    renderExerciseCheat(currentExercise);
    exerciseTip.textContent = activeContent.tip || currentExercise.tip;
    feedback.textContent = "";
    feedback.className = "feedback";
    solution.hidden = true;
    solution.textContent = "";
    answerInput.value = "";
    answerInput.placeholder = activeContent.answerPlaceholder || "Escribe aquí tu respuesta";
    answerInput.inputMode = currentExercise.mode === "text" || currentExercise.mode === "base" ? "text" : "decimal";
    answerInput.disabled = false;
    checkButton.disabled = false;
    answerInput.focus();
  }

  function isCorrect(rawAnswer, exercise = currentExercise) {
    if (!rawAnswer) return false;
    if (exercise.mode === "decimal") {
      const submitted = Number(cleanInput(rawAnswer));
      const expected = Number(exercise.answer);
      return Number.isFinite(submitted) &&
        Math.abs(submitted - expected) <= (exercise.tolerance || 0.000001);
    }
    if (exercise.mode === "text") {
      const normalize = (value) => value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalize(rawAnswer) === normalize(exercise.answer);
    }
    if (exercise.mode === "base") {
      return normalizeBaseAnswer(rawAnswer) === normalizeBaseAnswer(exercise.answer);
    }
    return cleanBinary(rawAnswer).toLowerCase() === cleanBinary(exercise.answer).toLowerCase();
  }

  function solutionExplanation(exercise) {
    if (exercise.cheatType === "conversion") {
      if (exercise.conversionTo === 10) {
        return "Desarrolla el número con potencias de su base de origen, empezando por la posición 0 a la derecha, y suma los productos. " + exercise.explanation;
      }
      if (exercise.conversionFrom === 10) {
        return "Divide el decimal repetidamente entre la base de destino. Lee los restos desde el último al primero para formar la respuesta. " + exercise.explanation;
      }
      if (exercise.conversionFrom === 2 && (exercise.conversionTo === 8 || exercise.conversionTo === 16)) {
        return "Separa los bits en grupos desde la derecha: de 3 en 3 para octal y de 4 en 4 para hexadecimal. Convierte cada grupo. " + exercise.explanation;
      }
      if ((exercise.conversionFrom === 8 || exercise.conversionFrom === 16) && exercise.conversionTo === 2) {
        return "Cambia cada dígito por su grupo de bits: 3 bits por dígito octal o 4 bits por dígito hexadecimal. Después junta los grupos. " + exercise.explanation;
      }
      return "Convierte primero a decimal con el valor posicional de la base de origen y luego divide entre la base de destino. " + exercise.explanation;
    }
    if (exercise.cheatType === "fraction") {
      if (exercise.type.includes("BINARIO A DECIMAL")) {
        return "A la izquierda de la coma se usan 1, 2, 4…; a la derecha, 0,5, 0,25, 0,125… Multiplica cada bit por su peso y suma los resultados. " + exercise.explanation;
      }
      return "Convierte la parte entera dividiendo entre 2. Para la parte decimal, multiplica por 2 y escribe cada parte entera que aparezca, de arriba abajo. " + exercise.explanation;
    }
    if (exercise.cheatType === "addition") {
      return "Empieza por la derecha y suma una columna cada vez. Cuando la suma sea 2 (1 + 1), escribe 0 y lleva 1 a la siguiente columna. " + exercise.explanation;
    }
    if (exercise.cheatType === "subtraction") {
      return "Empieza por la derecha. Si tienes que hacer 0 − 1, pide 1 prestado: esa columna pasa a valer 10₂ y 10₂ − 1₂ = 1₂. " + exercise.explanation;
    }
    if (exercise.cheatType === "C1") {
      return "Invierte cada bit del número que restas, súmalo al primero y, si sobra un acarreo por la izquierda, añádelo al resultado por la derecha. " + exercise.explanation;
    }
    if (exercise.cheatType === "C2") {
      return "Invierte cada bit del número que restas, suma 1 y después súmalo al primer número. Si queda un acarreo a la izquierda, se descarta. " + exercise.explanation;
    }
    if (exercise.cheatType === "parity") {
      return exercise.parityTask === "check"
        ? "Cuenta cuántos bits 1 hay en toda la secuencia. Un total divisible entre 2 es par; si sobra 1, es impar. " + exercise.explanation
        : "Cuenta los unos que ya aparecen. Añade 0 si el total ya cumple la paridad pedida o 1 si necesitas cambiarlo. " + exercise.explanation;
    }
    return "Aplica la regla de " + exercise.logicOperation + " a cada pareja de bits, columna por columna. " + exercise.explanation;
  }

  function solutionAdvice(exercise) {
    if (exercise.cheatType === "conversion") {
      if (exercise.conversionFrom === 2 && exercise.conversionTo === 8) return "Haz grupos de 3 bits desde la derecha; añade ceros solo al principio para completar el primer grupo.";
      if (exercise.conversionFrom === 2 && exercise.conversionTo === 16) return "Haz grupos de 4 bits desde la derecha. Recuerda que 1010₂=A₁₆ y 1111₂=F₁₆.";
      if (exercise.conversionTo === 2 && (exercise.conversionFrom === 8 || exercise.conversionFrom === 16)) return "No pierdas los ceros al inicio de cada grupo: cada dígito se transforma siempre en 3 o 4 bits.";
      if (exercise.conversionTo === 10) return "Empieza por la derecha con exponente 0 y aumenta el exponente una unidad en cada posición hacia la izquierda.";
      if (exercise.conversionFrom === 10) return "Anota cada resto justo debajo de la división; el resultado se lee desde el último resto hacia arriba.";
      return "Si usas una base intermedia, revisa primero el valor decimal antes de convertir al destino.";
    }
    if (exercise.cheatType === "fraction" && exercise.type.includes("BINARIO A DECIMAL")) {
      return "Después de la coma, empieza con medio y divide ese peso entre 2 en cada posición.";
    }
    if (exercise.cheatType === "fraction") {
      return "Al multiplicar la parte decimal por 2, guarda el 0 o el 1 de cada paso en el mismo orden.";
    }
    if (exercise.cheatType === "addition") {
      return "Escribe cada acarreo encima de la columna siguiente para no perderlo.";
    }
    if (exercise.cheatType === "subtraction") {
      return "Si no puedes pedir prestado de la columna inmediata, busca el primer 1 a la izquierda; los ceros intermedios pasan a valer 1.";
    }
    if (exercise.cheatType === "C1") {
      return "No olvides el acarreo recurrente: en complemento a 1 vuelve al bit de la derecha.";
    }
    if (exercise.cheatType === "C2") {
      return "En complemento a 2 el acarreo final se descarta; no lo sumes otra vez.";
    }
    if (exercise.cheatType === "parity") {
      return "La paridad depende solo de si hay una cantidad par o impar de unos; los ceros no cambian el conteo.";
    }
    if (exercise.logicOperation === "AND") return "AND solo da 1 cuando los dos bits de esa columna son 1.";
    if (exercise.logicOperation === "OR") return "OR da 1 si al menos uno de los dos bits de esa columna es 1.";
    if (exercise.logicOperation === "NAND") return "NAND es AND y luego se invierte el resultado.";
    if (exercise.logicOperation === "NOR") return "NOR es OR y luego se invierte el resultado.";
    if (exercise.logicOperation === "XOR") return "XOR da 1 cuando los dos bits de esa columna son diferentes.";
    return "NOT trabaja con un solo número: cambia cada 0 por 1 y cada 1 por 0.";
  }

  function renderSolution() {
    solution.replaceChildren();

    const header = document.createElement("div");
    header.className = "solution-header";
    const mark = document.createElement("span");
    mark.className = "solution-mark";
    mark.textContent = "✓";
    const heading = document.createElement("div");
    const headingTitle = document.createElement("strong");
    headingTitle.textContent = "Solución del ejercicio";
    const headingSubtitle = document.createElement("span");
    headingSubtitle.textContent = "Mira el resultado y sigue el razonamiento";
    heading.append(headingTitle, headingSubtitle);
    header.append(mark, heading);

    const result = document.createElement("div");
    result.className = "solution-result";
    const resultLabel = document.createElement("span");
    resultLabel.textContent = "RESULTADO";
    const resultValue = document.createElement("strong");
    const resultBaseSuffix = currentExercise.mode === "decimal" ? "₁₀" :
      currentExercise.mode === "text" ? "" :
        currentExercise.mode === "base" ? baseSubscripts[currentExercise.answerBase] : "₂";
    resultValue.textContent = currentExercise.answer + resultBaseSuffix;
    result.append(resultLabel, resultValue);

    const explanation = document.createElement("div");
    explanation.className = "solution-explanation";
    const explanationLabel = document.createElement("strong");
    explanationLabel.textContent = "Cómo resolverlo";
    const explanationText = document.createElement("p");
    explanationText.textContent = solutionExplanation(currentExercise);
    explanation.append(explanationLabel, explanationText);

    const advice = document.createElement("div");
    advice.className = "solution-advice";
    const adviceLabel = document.createElement("strong");
    adviceLabel.textContent = "Consejo";
    const adviceText = document.createElement("p");
    adviceText.textContent = solutionAdvice(currentExercise);
    advice.append(adviceLabel, adviceText);

    solution.append(header, result, explanation, advice);
    solution.hidden = false;
  }
  function checkAnswer() {
    if (!currentExercise) return;
    const answer = answerInput.value.trim();
    if (!answer) {
      feedback.textContent = "Escribe una respuesta antes de comprobarla.";
      feedback.className = "feedback bad";
      answerInput.focus();
      return;
    }
    const activeStep = currentExercise.steps && currentExercise.steps[currentExercise.stepIndex];
    if (isCorrect(answer, activeStep || currentExercise)) {
      if (activeStep && currentExercise.stepIndex < currentExercise.steps.length - 1) {
        const completedStep = currentExercise.stepIndex + 1;
        currentExercise.stepIndex += 1;
        const nextStep = currentExercise.steps[currentExercise.stepIndex];
        exerciseTitle.textContent = nextStep.title;
        renderProblem(nextStep);
        exerciseTip.textContent = nextStep.tip || currentExercise.tip;
        answerInput.value = "";
        answerInput.placeholder = nextStep.answerPlaceholder || "Escribe el resultado de este paso";
        feedback.textContent = "Paso " + completedStep + " correcto. Sigue con el siguiente paso.";
        feedback.className = "feedback good";
        answerInput.focus();
        return;
      }
      feedback.textContent = currentExercise.steps ? "¡Correcto! Has completado todos los pasos." : "¡Correcto! Has resuelto el reto.";
      feedback.className = "feedback good";
    } else {
      feedback.textContent = "Aún no. Revisa las posiciones y vuelve a intentarlo.";
      feedback.className = "feedback bad";
      if (activeStep && currentExercise.stepIndex < currentExercise.steps.length - 1) return;
    }
    renderSolution();
  }


  const themeToggle = $("#themeToggle");
  const savedTheme = localStorage.getItem("binario-lab-theme");
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
    themeToggle.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
    themeToggle.querySelector(".theme-label").textContent = dark ? "Modo claro" : "Modo oscuro";
    document.querySelector('meta[name="theme-color"]').content = dark ? "#111827" : "#101a2d";
  }

  applyTheme(savedTheme || (preferredDark ? "dark" : "light"));
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("binario-lab-theme", nextTheme);
    applyTheme(nextTheme);
  });
  generateButton.addEventListener("click", renderExercise);
  checkButton.addEventListener("click", checkAnswer);
  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") checkAnswer();
  });

  let calculatorCurrent = "0";
  let calculatorStoredValue = null;
  let calculatorPendingOperator = null;
  let calculatorResetOnDigit = false;

  function updateCalculatorDisplay() {
    calculatorDisplay.textContent = calculatorCurrent.replace(".", ",").slice(0, 16);
  }

  function calculatorApplyOperator(left, operator, right) {
    if (operator === "+") return left + right;
    if (operator === "-") return left - right;
    if (operator === "*") return left * right;
    if (operator === "/") return right === 0 ? null : left / right;
    return right === 0 ? null : left % right;
  }

  function calculatorUseOperator(operator) {
    if (operator === "%") {
      const percentage = Number(calculatorCurrent.replace(",", ".")) / 100;
      calculatorCurrent = String(Number(percentage.toPrecision(10)));
      calculatorResetOnDigit = true;
      calculatorStatus.textContent = "Porcentaje: dividido entre 100.";
      updateCalculatorDisplay();
      return;
    }
    if (calculatorPendingOperator && !calculatorResetOnDigit) calculatorEquals();
    calculatorStoredValue = Number(calculatorCurrent.replace(",", "."));
    calculatorPendingOperator = operator;
    calculatorResetOnDigit = true;
    calculatorStatus.textContent = "Introduce el siguiente número y pulsa =.";
  }

  function calculatorEquals() {
    if (!calculatorPendingOperator || calculatorStoredValue === null) return;
    const right = Number(calculatorCurrent.replace(",", "."));
    const result = calculatorApplyOperator(calculatorStoredValue, calculatorPendingOperator, right);
    if (result === null || !Number.isFinite(result)) {
      calculatorCurrent = "0";
      calculatorStatus.textContent = "No se puede dividir entre cero.";
    } else {
      calculatorCurrent = String(Number(result.toPrecision(10)));
      calculatorStatus.textContent = "Resultado.";
    }
    calculatorStoredValue = null;
    calculatorPendingOperator = null;
    calculatorResetOnDigit = true;
    updateCalculatorDisplay();
  }

  calculatorKeys.forEach((key) => {
    key.addEventListener("click", () => {
      if (key.dataset.calcDigit !== undefined) {
        const digit = key.dataset.calcDigit;
        if (calculatorResetOnDigit) {
          calculatorCurrent = digit;
          calculatorResetOnDigit = false;
        } else if (calculatorCurrent === "0") {
          calculatorCurrent = digit;
        } else if (calculatorCurrent.replace(/[^0-9]/g, "").length < 14) {
          calculatorCurrent += digit;
        }
        calculatorStatus.textContent = "Lista para calcular.";
        updateCalculatorDisplay();
        return;
      }

      if (key.dataset.calcOperator) {
        calculatorUseOperator(key.dataset.calcOperator);
        updateCalculatorDisplay();
        return;
      }

      const action = key.dataset.calcAction;
      if (action === "clear") {
        calculatorCurrent = "0";
        calculatorStoredValue = null;
        calculatorPendingOperator = null;
        calculatorResetOnDigit = false;
        calculatorStatus.textContent = "Lista para calcular.";
      } else if (action === "backspace") {
        if (calculatorResetOnDigit) {
          calculatorCurrent = "0";
          calculatorResetOnDigit = false;
        } else {
          calculatorCurrent = calculatorCurrent.length <= 1 || calculatorCurrent.length === 2 && calculatorCurrent[0] === "-"
            ? "0" : calculatorCurrent.slice(0, -1);
        }
      } else if (action === "decimal") {
        if (calculatorResetOnDigit) {
          calculatorCurrent = "0.";
          calculatorResetOnDigit = false;
        } else if (!calculatorCurrent.includes(".")) {
          calculatorCurrent += ".";
        }
      } else if (action === "sign") {
        calculatorCurrent = calculatorCurrent.startsWith("-") ? calculatorCurrent.slice(1) : "-" + calculatorCurrent;
      } else if (action === "equals") {
        calculatorEquals();
      }
      updateCalculatorDisplay();
    });
  });
})();
























