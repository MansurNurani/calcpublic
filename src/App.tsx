import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator as CalcIcon, 
  History, 
  Trash2, 
  Moon, 
  Sun, 
  Delete, 
  Sparkles, 
  Info, 
  Copy, 
  Check, 
  RotateCcw,
  Scale,
  DollarSign,
  Thermometer,
  Ruler
} from 'lucide-react';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

type CalculatorMode = 'simple' | 'scientific' | 'converter';

export default function App() {
  const [mode, setMode] = useState<CalculatorMode>('simple');
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [usePersianDigits, setUsePersianDigits] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [converterTab, setConverterTab] = useState<'length' | 'weight' | 'temperature'>('length');
  const [convInput, setConvInput] = useState<string>('1');
  const [convFrom, setConvFrom] = useState<string>('m');
  const [convTo, setConvTo] = useState<string>('cm');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('calc_history', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'simple' && mode !== 'scientific') return;
      
      if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
        inputDigit(e.key);
      } else if (e.key === '+') {
        performOperation('+');
      } else if (e.key === '-') {
        performOperation('-');
      } else if (e.key === '*') {
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, value, pendingOperator, waitingForOperand, mode]);

  const toPersianDigits = (str: string | number): string => {
    if (!usePersianDigits) return String(str);
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/[0-9]/g, (d) => persianNumbers[parseInt(d, 10)]);
  };

  const toEnglishDigits = (str: string): string => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let res = str;
    persianNumbers.forEach((p, i) => {
      res = res.replace(new RegExp(p, 'g'), String(i));
    });
    return res;
  };

  const formatDisplay = (numStr: string) => {
    if (numStr === 'خطا' || numStr === 'Error') return 'خطا';
    // If it's a number, format neatly
    if (numStr.endsWith('.')) return toPersianDigits(numStr);
    const parts = numStr.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
    return toPersianDigits(formatted);
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setPendingOperator(null);
    setValue(null);
    setWaitingForOperand(false);
  };

  const handleClearEntry = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const toggleSign = () => {
    const current = parseFloat(display);
    if (current === 0) return;
    setDisplay(String(-current));
  };

  const inputPercent = () => {
    const current = parseFloat(display);
    const result = current / 100;
    setDisplay(String(result));
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (value === null) {
      setValue(inputValue);
    } else if (pendingOperator) {
      const currentValue = value;
      let newValue = currentValue;

      switch (pendingOperator) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = inputValue === 0 ? NaN : currentValue / inputValue;
          break;
        case '^':
          newValue = Math.pow(currentValue, inputValue);
          break;
      }

      if (isNaN(newValue)) {
        setDisplay('خطا');
        setValue(null);
        setPendingOperator(null);
        setWaitingForOperand(true);
        return;
      }

      setValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setPendingOperator(nextOperator);
    setExpression(`${value !== null ? value : inputValue} ${nextOperator} `);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (pendingOperator && value !== null) {
      const currentValue = value;
      let newValue = currentValue;
      const exprText = `${currentValue} ${pendingOperator} ${inputValue} =`;

      switch (pendingOperator) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = inputValue === 0 ? NaN : currentValue / inputValue;
          break;
        case '^':
          newValue = Math.pow(currentValue, inputValue);
          break;
      }

      if (isNaN(newValue)) {
        setDisplay('خطا');
      } else {
        const resStr = String(newValue);
        setDisplay(resStr);
        addToHistory(exprText, resStr);
      }

      setValue(null);
      setPendingOperator(null);
      setWaitingForOperand(true);
      setExpression('');
    }
  };

  const handleScientific = (func: string) => {
    const current = parseFloat(display);
    let result = current;
    let exprName = '';

    switch (func) {
      case 'sin':
        result = Math.sin((current * Math.PI) / 180);
        exprName = `sin(${current})`;
        break;
      case 'cos':
        result = Math.cos((current * Math.PI) / 180);
        exprName = `cos(${current})`;
        break;
      case 'tan':
        result = Math.tan((current * Math.PI) / 180);
        exprName = `tan(${current})`;
        break;
      case 'sqrt':
        if (current < 0) {
          setDisplay('خطا');
          return;
        }
        result = Math.sqrt(current);
        exprName = `√(${current})`;
        break;
      case 'square':
        result = Math.pow(current, 2);
        exprName = `${current}²`;
        break;
      case 'log':
        if (current <= 0) {
          setDisplay('خطا');
          return;
        }
        result = Math.log10(current);
        exprName = `log(${current})`;
        break;
      case 'ln':
        if (current <= 0) {
          setDisplay('خطا');
          return;
        }
        result = Math.log(current);
        exprName = `ln(${current})`;
        break;
      case 'inv':
        if (current === 0) {
          setDisplay('خطا');
          return;
        }
        result = 1 / current;
        exprName = `1/${current}`;
        break;
      case 'pi':
        result = Math.PI;
        exprName = 'π';
        break;
      case 'e':
        result = Math.E;
        exprName = 'e';
        break;
    }

    const resStr = String(result);
    setDisplay(resStr);
    addToHistory(exprName, resStr);
    setWaitingForOperand(true);
  };

  const addToHistory = (expr: string, res: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      expression: expr,
      result: res,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Unit conversions
  const lengthUnits: { [key: string]: number } = {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    km: 1000,
    inch: 0.0254,
    ft: 0.3048,
  };

  const weightUnits: { [key: string]: number } = {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    t: 1000,
    lb: 0.453592,
  };

  const convertValue = () => {
    const val = parseFloat(convInput) || 0;
    if (converterTab === 'length') {
      const baseVal = val * lengthUnits[convFrom];
      const result = baseVal / lengthUnits[convTo];
      return result.toFixed(4).replace(/\.?0+$/, '');
    } else if (converterTab === 'weight') {
      const baseVal = val * weightUnits[convFrom];
      const result = baseVal / weightUnits[convTo];
      return result.toFixed(4).replace(/\.?0+$/, '');
    } else if (converterTab === 'temperature') {
      if (convFrom === convTo) return val;
      let celsius = val;
      if (convFrom === 'F') celsius = (val - 32) * (5/9);
      if (convFrom === 'K') celsius = val - 273.15;

      let res = celsius;
      if (convTo === 'F') res = celsius * (9/5) + 32;
      if (convTo === 'K') res = celsius + 273.15;
      return res.toFixed(2).replace(/\.?0+$/, '');
    }
    return '0';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 transition-colors duration-300">
      
      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-4 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-md">
            <CalcIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">ماشین حساب</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">با فونت وزیرمتن و طراحی زیبا</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Persian / English digit toggle */}
          <button
            onClick={() => setUsePersianDigits(!usePersianDigits)}
            title="تغییر ارقام (فارسی / انگلیسی)"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {usePersianDigits ? '۰-۹ فارسی' : '0-9 EN'}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="تغییر حالت تاریک"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-xl transition-colors ${showHistory ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            aria-label="تاریخچه محاسبات"
            title="تاریخچه"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div className="w-full max-w-md flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl mb-4 gap-1 shadow-inner">
        <button
          onClick={() => setMode('simple')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'simple' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          ساده
        </button>
        <button
          onClick={() => setMode('scientific')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'scientific' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          مهندسی
        </button>
        <button
          onClick={() => setMode('converter')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'converter' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          مبدل واحد
        </button>
      </div>

      {/* Main Calculator Container */}
      <main className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* History Modal / Drawer */}
        {showHistory && (
          <div className="bg-slate-50 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 p-4 max-h-60 overflow-y-auto transition-all animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تاریخچه محاسبات ({toPersianDigits(history.length)})</span>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> پاک کردن
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">هنوز محاسباتی انجام نشده است</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 transition-colors">
                    <div className="overflow-hidden">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{toPersianDigits(item.expression)}</div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{toPersianDigits(item.result)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(item.result, item.id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="کپی نتیجه"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Display Screen */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 text-left flex flex-col justify-end min-h-[130px]">
          <div className="text-xs text-slate-400 dark:text-slate-500 h-6 truncate font-mono text-left">
            {toPersianDigits(expression)} {pendingOperator ? toPersianDigits(pendingOperator) : ''}
          </div>
          <div className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white truncate font-mono text-left mt-1">
            {formatDisplay(display)}
          </div>
        </div>

        {/* Mode 1 & 2: Simple / Scientific Keypad */}
        {mode !== 'converter' ? (
          <div className="p-4 sm:p-5">
            {mode === 'scientific' && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                <button onClick={() => handleScientific('sin')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">sin</button>
                <button onClick={() => handleScientific('cos')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">cos</button>
                <button onClick={() => handleScientific('tan')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">tan</button>
                <button onClick={() => handleScientific('sqrt')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">√x</button>
                <button onClick={() => handleScientific('square')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">x²</button>
                
                <button onClick={() => handleScientific('log')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">log</button>
                <button onClick={() => handleScientific('ln')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">ln</button>
                <button onClick={() => performOperation('^')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">x^y</button>
                <button onClick={() => handleScientific('pi')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">π</button>
                <button onClick={() => handleScientific('e')} className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-colors">e</button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2.5">
              {/* Row 1 */}
              <button 
                onClick={handleClear}
                className="py-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-sm"
              >
                AC
              </button>
              <button 
                onClick={handleClearEntry}
                className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                C
              </button>
              <button 
                onClick={handleBackspace}
                className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button 
                onClick={() => performOperation('÷')}
                className="py-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-lg"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button 
                onClick={() => inputDigit('7')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('7')}
              </button>
              <button 
                onClick={() => inputDigit('8')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('8')}
              </button>
              <button 
                onClick={() => inputDigit('9')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('9')}
              </button>
              <button 
                onClick={() => performOperation('×')}
                className="py-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-lg"
              >
                ×
              </button>

              {/* Row 3 */}
              <button 
                onClick={() => inputDigit('4')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('4')}
              </button>
              <button 
                onClick={() => inputDigit('5')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('5')}
              </button>
              <button 
                onClick={() => inputDigit('6')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('6')}
              </button>
              <button 
                onClick={() => performOperation('-')}
                className="py-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-lg"
              >
                -
              </button>

              {/* Row 4 */}
              <button 
                onClick={() => inputDigit('1')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('1')}
              </button>
              <button 
                onClick={() => inputDigit('2')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('2')}
              </button>
              <button 
                onClick={() => inputDigit('3')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('3')}
              </button>
              <button 
                onClick={() => performOperation('+')}
                className="py-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-lg"
              >
                +
              </button>

              {/* Row 5 */}
              <button 
                onClick={toggleSign}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                ±
              </button>
              <button 
                onClick={() => inputDigit('0')}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                {toPersianDigits('0')}
              </button>
              <button 
                onClick={inputDecimal}
                className="py-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              >
                .
              </button>
              <button 
                onClick={handleEquals}
                className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-colors text-lg flex items-center justify-center"
              >
                =
              </button>
            </div>
          </div>
        ) : (
          /* Mode 3: Unit Converter */
          <div className="p-5 flex flex-col gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                onClick={() => { setConverterTab('length'); setConvFrom('m'); setConvTo('cm'); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${converterTab === 'length' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Ruler className="w-3.5 h-3.5" /> طول
              </button>
              <button
                onClick={() => { setConverterTab('weight'); setConvFrom('kg'); setConvTo('g'); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${converterTab === 'weight' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Scale className="w-3.5 h-3.5" /> وزن
              </button>
              <button
                onClick={() => { setConverterTab('temperature'); setConvFrom('C'); setConvTo('F'); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${converterTab === 'temperature' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Thermometer className="w-3.5 h-3.5" /> دما
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">مقدار ورودی</label>
                <input
                  type="number"
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">از واحد</label>
                  <select
                    value={convFrom}
                    onChange={(e) => setConvFrom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {converterTab === 'length' && (
                      <>
                        <option value="m">متر (m)</option>
                        <option value="cm">سانتی‌متر (cm)</option>
                        <option value="mm">میلی‌متر (mm)</option>
                        <option value="km">کیلومتر (km)</option>
                        <option value="inch">اینچ (inch)</option>
                        <option value="ft">فوت (ft)</option>
                      </>
                    )}
                    {converterTab === 'weight' && (
                      <>
                        <option value="kg">کیلوگرم (kg)</option>
                        <option value="g">گرم (g)</option>
                        <option value="mg">میلی‌گرم (mg)</option>
                        <option value="t">تن (t)</option>
                        <option value="lb">پوند (lb)</option>
                      </>
                    )}
                    {converterTab === 'temperature' && (
                      <>
                        <option value="C">سلسیوس (°C)</option>
                        <option value="F">فارنهایت (°F)</option>
                        <option value="K">کلوین (K)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">به واحد</label>
                  <select
                    value={convTo}
                    onChange={(e) => setConvTo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {converterTab === 'length' && (
                      <>
                        <option value="m">متر (m)</option>
                        <option value="cm">سانتی‌متر (cm)</option>
                        <option value="mm">میلی‌متر (mm)</option>
                        <option value="km">کیلومتر (km)</option>
                        <option value="inch">اینچ (inch)</option>
                        <option value="ft">فوت (ft)</option>
                      </>
                    )}
                    {converterTab === 'weight' && (
                      <>
                        <option value="kg">کیلوگرم (kg)</option>
                        <option value="g">گرم (g)</option>
                        <option value="mg">میلی‌گرم (mg)</option>
                        <option value="t">تن (t)</option>
                        <option value="lb">پوند (lb)</option>
                      </>
                    )}
                    {converterTab === 'temperature' && (
                      <>
                        <option value="C">سلسیوس (°C)</option>
                        <option value="F">فارنهایت (°F)</option>
                        <option value="K">کلوین (K)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 mt-2 text-center">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block mb-1">نتیجه تبدیل</span>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {toPersianDigits(convertValue())}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer info */}
      <footer className="w-full max-w-md text-center mt-6 text-xs text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>طراحی شده با فونت اختصاصی وزیرمتن</span>
      </footer>

    </div>
  );
}
