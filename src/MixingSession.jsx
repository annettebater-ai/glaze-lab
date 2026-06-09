/* Stock badges */
.stock-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  margin-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stock-badge.out {
  background: #fff0f0;
  color: #cc2200;
  border: 1px solid #ffcccc;
}

.stock-badge.low {
  background: #fff8e1;
  color: #aa7700;
  border: 1px solid #ffe082;
}

.mix-ingredient.stock-out {
  background: #fff8f8;
}

.text-danger {
  color: #cc2200 !important;
}

/* Cost panel */
.cost-panel {
  margin-top: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}

.cost-row-unknown {
  opacity: 0.5;
}

.cost-name {
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cost-est-badge {
  font-size: 10px;
  background: #fff8e1;
  color: #aa7700;
  border: 1px solid #ffe082;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.cost-amount {
  font-weight: 600;
  color: #1a3a5c;
}

.cost-unknown {
  font-style: italic;
  color: #aaa;
  font-size: 12px;
}

.cost-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
}