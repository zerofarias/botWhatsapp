import React from 'react';
import type { AvailableVariableUI } from './TextNodeForm';

interface OrderNodeFormProps {
  concept?: string;
  request?: string;
  customerData?: string;
  paymentMethod?: string;
  sendConfirmation?: boolean;
  confirmationMessage?: string;
  availableVariables?: AvailableVariableUI[];
  onChange: (data: {
    orderConcept: string;
    orderRequest: string;
    orderCustomerData: string;
    orderPaymentMethod: string;
    orderSendConfirmation: boolean;
    orderConfirmationMessage: string;
  }) => void;
}

const INPUT_PLACEHOLDER = 'Puedes usar variables con nombreVariable';

export const OrderNodeForm: React.FC<OrderNodeFormProps> = ({
  concept = '',
  request = '',
  customerData = '',
  paymentMethod = '',
  sendConfirmation = false,
  confirmationMessage = '',
  availableVariables = [],
  onChange,
}) => {
  const emitChange = (patch: Partial<OrderNodeFormProps>) => {
    onChange({
      orderConcept:
        typeof patch.concept === 'string' ? patch.concept : concept,
      orderRequest:
        typeof patch.request === 'string' ? patch.request : request,
      orderCustomerData:
        typeof patch.customerData === 'string'
          ? patch.customerData
          : customerData,
      orderPaymentMethod:
        typeof patch.paymentMethod === 'string'
          ? patch.paymentMethod
          : paymentMethod,
      orderSendConfirmation:
        typeof patch.sendConfirmation === 'boolean'
          ? patch.sendConfirmation
          : sendConfirmation,
      orderConfirmationMessage:
        typeof patch.confirmationMessage === 'string'
          ? patch.confirmationMessage
          : confirmationMessage,
    });
  };

  const variableHints = (
    <div className="available-variables">
      <p className="flow-node-form__hint">
        Variables disponibles para interpolar (usa variableNombre):
      </p>
      <div className="variable-chip-grid">
        {availableVariables.map((variable) => (
          <span key={variable.name} className="variable-chip">
            
            {variable.name}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flow-node-form order-node-form">
      <div className="form-control">
        <label>Concepto del pedido</label>
        <input
          type="text"
          value={concept}
          placeholder="Ej: Pedido de farmacia"
          onChange={(event) => emitChange({ concept: event.target.value })}
        />
        <small className="flow-node-form__hint">
          Se usa como tipo de pedido en el tablero y admite variables. {INPUT_PLACEHOLDER}
        </small>
      </div>

      <div className="form-control">
        <label>Detalle de lo solicitado</label>
        <textarea
          rows={3}
          value={request}
          placeholder="Ej: Ibuprofeno 600mg x 30 comprimidos"
          onChange={(event) => emitChange({ request: event.target.value })}
        />
      </div>

      <div className="form-control">
        <label>Datos del cliente</label>
        <textarea
          rows={3}
          value={customerData}
          placeholder="Ej: DNI, direccion, preferencia de contacto"
          onChange={(event) => emitChange({ customerData: event.target.value })}
        />
      </div>

      <div className="form-control">
        <label>Metodo de pago preferido</label>
        <input
          type="text"
          value={paymentMethod}
          placeholder="Ej: Efectivo / Transferencia"
          onChange={(event) => emitChange({ paymentMethod: event.target.value })}
        />
      </div>

      <label className="checkbox-control">
        <input
          type="checkbox"
          checked={sendConfirmation}
          onChange={(event) =>
            emitChange({ sendConfirmation: event.target.checked })
          }
        />
        <span>Enviar mensaje de confirmacion al cliente cuando se cree el pedido</span>
      </label>

      {sendConfirmation && (
        <div className="form-control">
          <label>Mensaje de confirmacion</label>
          <textarea
            rows={3}
            value={confirmationMessage}
            placeholder="Ej: Su pedido fue registrado con el numero orderId"
            onChange={(event) =>
              emitChange({ confirmationMessage: event.target.value })
            }
          />
        </div>
      )}

      {availableVariables.length > 0 && variableHints}
    </div>
  );
};
