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
    const floor1 = { style: {} };
    const floor2 = { style: {} };
    const svg = {
        setAttribute(name, value) { this[name] = value; },
        querySelector(selector) { return selector === '#layer11' ? floor1 : floor2; }
    };
    const buttons = ['1', '2'].map(floor => ({
        dataset: { floor },
        setAttribute(name, value) { this[name] = value; }
    }));
    context.document.querySelector = () => svg;
    context.document.querySelectorAll = () => buttons;
    context.setSvgFloor('2');
    assert.equal(svg.viewBox, '332 0 176 215');
    assert.deepEqual(buttons.map(button => button['aria-pressed']), ['false', 'true']);
    assert.equal(floor1.style.display, 'none');
    assert.equal(floor2.style.display, 'inline');
    context.setSvgFloor('1');
    assert.equal(svg.viewBox, '0 0 338 285.75');
    assert.deepEqual(buttons.map(button => button['aria-pressed']), ['true', 'false']);
    assert.equal(floor1.style.display, 'inline');
    assert.equal(floor2.style.display, 'none');
});

test('orienta el muñeco hacia el siguiente tramo y conserva la dirección al llegar', () => {
    const route = {
        getPointAtLength(distance) {
            if (distance <= 10) return { x: distance, y: 0 };
            if (distance <= 20) return { x: 10, y: distance - 10 };
            if (distance <= 30) return { x: 30 - distance, y: 10 };
            return { x: 0, y: 40 - distance };
        }
    };
    assert.equal(context.routeHeading(route, 0, 40), 90);
    assert.equal(context.routeHeading(route, 10, 40), 180);
    assert.equal(context.routeHeading(route, 20, 40), 270);
    assert.equal(context.routeHeading(route, 30, 40), 0);
    assert.equal(context.routeHeading(route, 40, 40), 0);
});
