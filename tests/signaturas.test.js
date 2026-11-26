const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({
    document: { addEventListener() {} },
    window: { addEventListener() {} }
});
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);

test('exige tres cifras antes de buscar una signatura', () => {
    for (const signature of ['4', '8', '12', '12.34', 'A41']) {
        assert.equal(context.validateSignature(signature), false, signature);
    }
    for (const signature of ['541', '412', '005.131 J88pr', 'A412', '658,403']) {
        assert.equal(context.validateSignature(signature), true, signature);
    }
});

test('conserva la búsqueda por clasificación en las tres sedes', () => {
    const result = vm.runInContext(`[
        searchInStacks(mapData['MEDELLÍN'], '658,403').stackInfo,
        searchInStacks(mapData['CENTRO REGIONAL ORIENTE'], '412').stackInfo,
        searchInStacks(mapData['CENTRO REGIONAL URABÁ'], '541').stackInfo
    ]`, context);
    assert.deepEqual(Array.from(result), ['1.6A2.Izquierdo', '1.2.Derecho', '1.1.Derecho']);
});

test('cambia la vista del mapa y el estado de los botones de piso', () => {
    const svg = { setAttribute(name, value) { this[name] = value; } };
    const buttons = ['1', '2', 'all'].map(floor => ({
        dataset: { floor },
        setAttribute(name, value) { this[name] = value; }
    }));
    context.document.querySelector = () => svg;
    context.document.querySelectorAll = () => buttons;
    context.setSvgFloor('2');
    assert.equal(svg.viewBox, '332 0 176 215');
    assert.deepEqual(buttons.map(button => button['aria-pressed']), ['false', 'true', 'false']);
    context.setSvgFloor('all');
    assert.equal(svg.viewBox, '0 0 508 285.75');
    assert.deepEqual(buttons.map(button => button['aria-pressed']), ['false', 'false', 'true']);
});
