import { calcularResumoDiario } from './src/utils/pontoUtils.js';
try {
    const result = calcularResumoDiario([], { segunda: { ativo: true, entrada: '08:00', saida: '18:00' } }, ['2026-02-28']);
    console.log('Result:', JSON.stringify(result, null, 2));
} catch (e) {
    console.error('Error:', e);
}
