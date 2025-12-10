import React, { useState, useCallback } from 'react';
import type {
  HTTPMethod,
  HTTPQueryParam,
  HTTPHeader,
  HTTPResponseMapping,
  HTTPResponseFieldInfo,
  HTTPResponseValueType,
} from '../../views/FlowBuilder/types';
import './HTTPNodeForm.css';

export interface HTTPNodeFormProps {
  method: HTTPMethod;
  url: string;
  queryParams: HTTPQueryParam[];
  headers: HTTPHeader[];
  body?: string;
  bodyType?: 'none' | 'json' | 'form-urlencoded';
  responseVariableName: string;
  responseVariablePrefix?: string;
  emptyResponseMessage?: string;
  fallbackNodeId?: string | null;
  timeout?: number;
  responseMappings?: HTTPResponseMapping[];
  availableVariables?: Array<{
    name: string;
    createdByNodeId?: string;
    createdByNodeType?: string;
    createdByNodeLabel?: string;
  }>;
  onChange: (data: {
    method: HTTPMethod;
    url: string;
    queryParams: HTTPQueryParam[];
    headers: HTTPHeader[];
    body?: string;
    bodyType?: 'none' | 'json' | 'form-urlencoded';
    responseVariableName: string;
    responseVariablePrefix?: string;
    emptyResponseMessage?: string;
    fallbackNodeId?: string | null;
    timeout?: number;
    responseMappings?: HTTPResponseMapping[];
  }) => void;
}

const HTTP_METHODS: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const METHOD_COLORS: Record<HTTPMethod, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Función para extraer campos de un objeto JSON recursivamente
function extractJsonFields(
  obj: unknown,
  prefix = '',
  depth = 0,
  maxDepth = 5
): HTTPResponseFieldInfo[] {
  const fields: HTTPResponseFieldInfo[] = [];
  
  if (depth > maxDepth) return fields;
  
  if (obj === null) {
    fields.push({ path: prefix || 'response', type: 'null', value: null, depth });
    return fields;
  }
  
  if (Array.isArray(obj)) {
    fields.push({ path: prefix || 'response', type: 'array', value: obj, depth });
    // Extraer campos del primer elemento si existe
    if (obj.length > 0) {
      const firstItem = obj[0];
      const arrayPrefix = prefix ? `${prefix}[0]` : '[0]';
      fields.push(...extractJsonFields(firstItem, arrayPrefix, depth + 1, maxDepth));
    }
    return fields;
  }
  
  if (typeof obj === 'object') {
    if (prefix) {
      fields.push({ path: prefix, type: 'object', value: obj, depth });
    }
    for (const [key, value] of Object.entries(obj)) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      fields.push(...extractJsonFields(value, newPath, depth + 1, maxDepth));
    }
    return fields;
  }
  
  // Valores primitivos
  let type: 'string' | 'number' | 'boolean' = 'string';
  if (typeof obj === 'number') type = 'number';
  else if (typeof obj === 'boolean') type = 'boolean';
  
  fields.push({ path: prefix, type, value: obj, depth });
  return fields;
}

// Función para obtener valor de un path en un objeto
function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

// Función para generar nombre de variable desde path
function pathToVariableName(path: string, prefix: string): string {
  return prefix + path
    .replace(/\[(\d+)\]/g, '_$1')
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}

export const HTTPNodeForm: React.FC<HTTPNodeFormProps> = ({
  method,
  url,
  queryParams,
  headers,
  body,
  bodyType = 'none',
  responseVariableName,
  responseVariablePrefix = 'http_',
  emptyResponseMessage,
  fallbackNodeId,
  timeout = 30,
  responseMappings = [],
  availableVariables = [],
  onChange,
}) => {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data?: unknown;
    error?: string;
  }>({ status: 'idle' });
  const [extractedFields, setExtractedFields] = useState<HTTPResponseFieldInfo[]>([]);
  const [showResponseMapper, setShowResponseMapper] = useState(false);

  const normalizedVariables = React.useMemo(
    () =>
      availableVariables
        .map((v) => v.name?.trim())
        .filter((name): name is string => Boolean(name)),
    [availableVariables]
  );

  const handleVariableCopy = useCallback((name: string) => {
    const value = `\${${name}}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }
    setCopiedVariable(name);
    setTimeout(() => setCopiedVariable(null), 2000);
  }, []);

  const update = useCallback(
    (patch: Partial<HTTPNodeFormProps>) => {
      onChange({
        method,
        url,
        queryParams,
        headers,
        body,
        bodyType,
        responseVariableName,
        responseVariablePrefix,
        emptyResponseMessage,
        fallbackNodeId,
        timeout,
        responseMappings,
        ...patch,
      });
    },
    [
      method,
      url,
      queryParams,
      headers,
      body,
      bodyType,
      responseVariableName,
      responseVariablePrefix,
      emptyResponseMessage,
      fallbackNodeId,
      timeout,
      responseMappings,
      onChange,
    ]
  );

  // Query Params handlers
  const addQueryParam = () => {
    update({
      queryParams: [
        ...queryParams,
        { id: generateId(), key: '', value: '', enabled: true },
      ],
    });
  };

  const updateQueryParam = (
    id: string,
    field: keyof HTTPQueryParam,
    value: string | boolean
  ) => {
    update({
      queryParams: queryParams.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const removeQueryParam = (id: string) => {
    update({ queryParams: queryParams.filter((p) => p.id !== id) });
  };

  // Headers handlers
  const addHeader = () => {
    update({
      headers: [
        ...headers,
        { id: generateId(), key: '', value: '', enabled: true, secret: false },
      ],
    });
  };

  const updateHeader = (
    id: string,
    field: keyof HTTPHeader,
    value: string | boolean
  ) => {
    update({
      headers: headers.map((h) =>
        h.id === id ? { ...h, [field]: value } : h
      ),
    });
  };

  const removeHeader = (id: string) => {
    update({ headers: headers.filter((h) => h.id !== id) });
  };

  // Test request (usa proxy del backend para evitar CORS)
  const handleTestRequest = async () => {
    setTestResult({ status: 'loading' });
    setExtractedFields([]);
    setShowResponseMapper(false);
    try {
      // Build URL with query params
      const urlObj = new URL(url);
      queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => urlObj.searchParams.append(p.key, p.value));

      // Build headers
      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          requestHeaders[h.key] = h.value;
        });

      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyType !== 'none') {
        if (bodyType === 'json') {
          requestHeaders['Content-Type'] = 'application/json';
        } else if (bodyType === 'form-urlencoded') {
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }

      // Usar el proxy del backend para evitar problemas de CORS
      const proxyPayload = {
        method,
        url: urlObj.toString(),
        headers: requestHeaders,
        body: ['POST', 'PUT', 'PATCH'].includes(method) && bodyType !== 'none' ? body : undefined,
      };

      const token = localStorage.getItem('token');
      const proxyResponse = await fetch('/api/flows/http-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(proxyPayload),
      });

      const result = await proxyResponse.json();

      if (result.error) {
        setTestResult({
          status: 'error',
          error: result.error,
        });
      } else {
        const isSuccess = result.ok;
        setTestResult({
          status: isSuccess ? 'success' : 'error',
          data: result.data,
          error: isSuccess ? undefined : `HTTP ${result.status} ${result.statusText}`,
        });
        
        // Extraer campos si fue exitoso
        if (isSuccess && result.data) {
          const fields = extractJsonFields(result.data);
          setExtractedFields(fields);
          setShowResponseMapper(true);
        }
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  // Handlers para Response Mappings
  const addResponseMapping = (field: HTTPResponseFieldInfo) => {
    const newMapping: HTTPResponseMapping = {
      id: generateId(),
      path: field.path,
      variableName: pathToVariableName(field.path, responseVariablePrefix),
      valueType: field.type === 'array' || field.type === 'object' ? 'auto' : field.type as HTTPResponseValueType,
      enabled: true,
    };
    update({ responseMappings: [...responseMappings, newMapping] });
  };

  const updateResponseMapping = (
    id: string,
    field: keyof HTTPResponseMapping,
    value: string | boolean
  ) => {
    update({
      responseMappings: responseMappings.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  const removeResponseMapping = (id: string) => {
    update({
      responseMappings: responseMappings.filter((m) => m.id !== id),
    });
  };

  const toggleMappingEnabled = (id: string) => {
    update({
      responseMappings: responseMappings.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    });
  };

  const isFieldMapped = (path: string): boolean => {
    return responseMappings.some((m) => m.path === path);
  };

  const showBody = ['POST', 'PUT', 'PATCH'].includes(method);

  return (
    <div className="http-node-form">
      <h3 className="http-node-form__title">🌐 Petición HTTP</h3>

      {/* Method & URL */}
      <div className="http-node-form__method-url">
        <select
          className="http-node-form__method-select"
          value={method}
          onChange={(e) => update({ method: e.target.value as HTTPMethod })}
          style={{ backgroundColor: METHOD_COLORS[method] }}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="http-node-form__url-input"
          value={url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="https://api.ejemplo.com/endpoint"
        />
      </div>

      {/* Query Parameters */}
      <fieldset className="http-node-form__section">
        <legend>
          Parámetros Query
          <button
            type="button"
            className="http-node-form__add-btn"
            onClick={addQueryParam}
          >
            + Agregar
          </button>
        </legend>
        {queryParams.length === 0 ? (
          <p className="http-node-form__empty">Sin parámetros</p>
        ) : (
          <div className="http-node-form__params-list">
            {queryParams.map((param) => (
              <div key={param.id} className="http-node-form__param-row">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) =>
                    updateQueryParam(param.id, 'enabled', e.target.checked)
                  }
                />
                <input
                  type="text"
                  placeholder="Key"
                  value={param.key}
                  onChange={(e) =>
                    updateQueryParam(param.id, 'key', e.target.value)
                  }
                  className="http-node-form__key-input"
                />
                <input
                  type="text"
                  placeholder="Value (ej: ${flow_dni})"
                  value={param.value}
                  onChange={(e) =>
                    updateQueryParam(param.id, 'value', e.target.value)
                  }
                  className="http-node-form__value-input"
                />
                <button
                  type="button"
                  className="http-node-form__remove-btn"
                  onClick={() => removeQueryParam(param.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Headers */}
      <fieldset className="http-node-form__section">
        <legend>
          Headers
          <button
            type="button"
            className="http-node-form__add-btn"
            onClick={addHeader}
          >
            + Agregar
          </button>
        </legend>
        {headers.length === 0 ? (
          <p className="http-node-form__empty">Sin headers</p>
        ) : (
          <div className="http-node-form__params-list">
            {headers.map((header) => (
              <div key={header.id} className="http-node-form__param-row">
                <input
                  type="checkbox"
                  checked={header.enabled}
                  onChange={(e) =>
                    updateHeader(header.id, 'enabled', e.target.checked)
                  }
                />
                <input
                  type="text"
                  placeholder="Key"
                  value={header.key}
                  onChange={(e) =>
                    updateHeader(header.id, 'key', e.target.value)
                  }
                  className="http-node-form__key-input"
                />
                <div className="http-node-form__header-value-container">
                  <input
                    type={header.secret ? 'password' : 'text'}
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) =>
                      updateHeader(header.id, 'value', e.target.value)
                    }
                    className="http-node-form__value-input"
                  />
                  <button
                    type="button"
                    className="http-node-form__secret-toggle"
                    onClick={() =>
                      updateHeader(header.id, 'secret', !header.secret)
                    }
                    title={header.secret ? 'Mostrar valor' : 'Ocultar valor'}
                  >
                    {header.secret ? '👁️' : '🙈'}
                  </button>
                </div>
                <button
                  type="button"
                  className="http-node-form__remove-btn"
                  onClick={() => removeHeader(header.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Body (for POST/PUT/PATCH) */}
      {showBody && (
        <fieldset className="http-node-form__section">
          <legend>Body</legend>
          <div className="http-node-form__body-type">
            <label>
              <input
                type="radio"
                name="bodyType"
                value="none"
                checked={bodyType === 'none'}
                onChange={() => update({ bodyType: 'none' })}
              />
              Ninguno
            </label>
            <label>
              <input
                type="radio"
                name="bodyType"
                value="json"
                checked={bodyType === 'json'}
                onChange={() => update({ bodyType: 'json' })}
              />
              JSON
            </label>
            <label>
              <input
                type="radio"
                name="bodyType"
                value="form-urlencoded"
                checked={bodyType === 'form-urlencoded'}
                onChange={() => update({ bodyType: 'form-urlencoded' })}
              />
              Form URL Encoded
            </label>
          </div>
          {bodyType !== 'none' && (
            <textarea
              className="http-node-form__body-textarea"
              value={body || ''}
              onChange={(e) => update({ body: e.target.value })}
              placeholder={
                bodyType === 'json'
                  ? '{\n  "campo": "${variable}"\n}'
                  : 'campo1=valor1&campo2=valor2'
              }
              rows={5}
            />
          )}
        </fieldset>
      )}

      {/* Response Variable */}
      <fieldset className="http-node-form__section">
        <legend>Respuesta</legend>
        <div className="http-node-form__response-config">
          <label className="http-node-form__label">
            Nombre de variable
            <input
              type="text"
              value={responseVariableName}
              onChange={(e) =>
                update({ responseVariableName: e.target.value })
              }
              placeholder="Ej: dataAfiliado"
              className="http-node-form__input"
            />
            <small className="http-node-form__hint">
              Si el response es indexado (array), el prefijo será &quot;itbl_&quot;, sino
              &quot;http_&quot;
            </small>
          </label>

          <label className="http-node-form__label">
            Mensaje si respuesta vacía
            <textarea
              value={emptyResponseMessage || ''}
              onChange={(e) =>
                update({ emptyResponseMessage: e.target.value })
              }
              placeholder="Lo siento, no encontré información..."
              className="http-node-form__textarea"
              rows={2}
            />
          </label>

          <label className="http-node-form__label">
            Timeout (segundos)
            <input
              type="number"
              min={1}
              max={120}
              value={timeout}
              onChange={(e) => update({ timeout: parseInt(e.target.value, 10) })}
              className="http-node-form__input http-node-form__input--small"
            />
          </label>
        </div>
      </fieldset>

      {/* Available Variables */}
      {normalizedVariables.length > 0 && (
        <fieldset className="http-node-form__section">
          <legend>Variables disponibles</legend>
          <p className="http-node-form__hint">
            Haz clic para copiar y usar en URL, params o body
          </p>
          <div className="http-node-form__variables-grid">
            {normalizedVariables.map((name) => (
              <button
                key={name}
                type="button"
                className={`http-node-form__variable-pill ${
                  copiedVariable === name ? 'http-node-form__variable-pill--copied' : ''
                }`}
                onClick={() => handleVariableCopy(name)}
              >
                ${'{'}
                {name}
                {'}'}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Test Button */}
      <div className="http-node-form__test-section">
        <button
          type="button"
          className="http-node-form__test-btn"
          onClick={handleTestRequest}
          disabled={!url || testResult.status === 'loading'}
        >
          {testResult.status === 'loading' ? '⏳ Probando...' : '🚀 Probar petición'}
        </button>

        {testResult.status === 'success' && (
          <div className="http-node-form__test-result http-node-form__test-result--success">
            <strong>✅ Éxito</strong>
            <pre>{JSON.stringify(testResult.data as object, null, 2)}</pre>
          </div>
        )}

        {testResult.status === 'error' && (
          <div className="http-node-form__test-result http-node-form__test-result--error">
            <strong>❌ Error: {testResult.error}</strong>
            {testResult.data !== undefined && testResult.data !== null && (
              <pre>{typeof testResult.data === 'string' ? testResult.data : JSON.stringify(testResult.data, null, 2)}</pre>
            )}
          </div>
        )}
      </div>

      {/* Response Field Mapper */}
      {showResponseMapper && extractedFields.length > 0 && (
        <fieldset className="http-node-form__section http-node-form__response-mapper">
          <legend>📊 Mapear campos de respuesta</legend>
          <p className="http-node-form__hint">
            Selecciona los campos que deseas guardar como variables
          </p>
          
          <div className="http-node-form__fields-list">
            {extractedFields
              .filter(f => f.type !== 'object' && f.type !== 'array' || f.depth === 0)
              .map((field) => {
                const isMapped = isFieldMapped(field.path);
                const previewValue = typeof field.value === 'object' 
                  ? JSON.stringify(field.value).slice(0, 50) + '...'
                  : String(field.value).slice(0, 50);
                
                return (
                  <div 
                    key={field.path} 
                    className={`http-node-form__field-item ${isMapped ? 'http-node-form__field-item--mapped' : ''}`}
                    style={{ paddingLeft: `${field.depth * 12}px` }}
                  >
                    <div className="http-node-form__field-info">
                      <span className={`http-node-form__field-type http-node-form__field-type--${field.type}`}>
                        {field.type}
                      </span>
                      <code className="http-node-form__field-path">{field.path}</code>
                    </div>
                    <div className="http-node-form__field-preview" title={String(field.value)}>
                      {previewValue}
                    </div>
                    <button
                      type="button"
                      className={`http-node-form__field-add-btn ${isMapped ? 'http-node-form__field-add-btn--added' : ''}`}
                      onClick={() => !isMapped && addResponseMapping(field)}
                      disabled={isMapped}
                    >
                      {isMapped ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
          </div>
        </fieldset>
      )}

      {/* Response Mappings List */}
      {responseMappings.length > 0 && (
        <fieldset className="http-node-form__section http-node-form__mappings-section">
          <legend>🗂️ Variables mapeadas ({responseMappings.length})</legend>
          <div className="http-node-form__mappings-list">
            {responseMappings.map((mapping) => {
              const fieldValue = testResult.data 
                ? getValueByPath(testResult.data, mapping.path) 
                : undefined;
              
              return (
                <div 
                  key={mapping.id} 
                  className={`http-node-form__mapping-item ${!mapping.enabled ? 'http-node-form__mapping-item--disabled' : ''}`}
                >
                  <div className="http-node-form__mapping-header">
                    <label className="http-node-form__mapping-toggle">
                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={() => toggleMappingEnabled(mapping.id)}
                      />
                    </label>
                    <code className="http-node-form__mapping-path">{mapping.path}</code>
                    <button
                      type="button"
                      className="http-node-form__mapping-remove"
                      onClick={() => removeResponseMapping(mapping.id)}
                      title="Eliminar mapeo"
                    >
                      ×
                    </button>
                  </div>
                  <div className="http-node-form__mapping-config">
                    <input
                      type="text"
                      value={mapping.variableName}
                      onChange={(e) => updateResponseMapping(mapping.id, 'variableName', e.target.value)}
                      placeholder="Nombre de variable"
                      className="http-node-form__mapping-varname"
                    />
                    <select
                      value={mapping.valueType}
                      onChange={(e) => updateResponseMapping(mapping.id, 'valueType', e.target.value)}
                      className="http-node-form__mapping-type"
                    >
                      <option value="auto">Auto</option>
                      <option value="string">String</option>
                      <option value="number">Número</option>
                      <option value="boolean">Boolean</option>
                      <option value="object">Objeto</option>
                      <option value="array">Array</option>
                    </select>
                  </div>
                  {fieldValue !== undefined && (
                    <div className="http-node-form__mapping-preview">
                      <small>Valor actual: {typeof fieldValue === 'object' ? JSON.stringify(fieldValue).slice(0, 40) : String(fieldValue).slice(0, 40)}</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Fallback info */}
      <div className="http-node-form__info">
        <p>
          ⚠️ Si la petición falla o la respuesta está vacía, el flujo se
          interrumpirá. Puedes seleccionar un nodo de fallback conectando la
          salida &quot;Error&quot; a otro nodo.
        </p>
      </div>
    </div>
  );
};
