export class DALError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly table: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DALError';
  }
}

export class ValidationError extends DALError {
  constructor(
    message: string,
    operation: string,
    table: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(message, operation, table);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DALError {
  constructor(
    operation: string,
    table: string,
    public readonly id: number | string
  ) {
    super(`Record not found: ${table} with id ${id}`, operation, table);
    this.name = 'NotFoundError';
  }
}

export class ForeignKeyError extends DALError {
  constructor(
    operation: string,
    table: string,
    public readonly foreignKey: string,
    public readonly foreignValue: any
  ) {
    super(`Foreign key constraint failed: ${foreignKey} = ${foreignValue}`, operation, table);
    this.name = 'ForeignKeyError';
  }
}

export class UniqueConstraintError extends DALError {
  constructor(
    operation: string,
    table: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(`Unique constraint violation: ${field} = ${value}`, operation, table);
    this.name = 'UniqueConstraintError';
  }
}

export class TransactionError extends DALError {
  constructor(
    message: string,
    operation: string,
    originalError?: Error
  ) {
    super(message, operation, 'transaction', originalError);
    this.name = 'TransactionError';
  }
}

export function handleDatabaseError(error: any, operation: string, table: string): never {
  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    const match = error.message.match(/FOREIGN KEY constraint failed/);
    if (match) {
      throw new ForeignKeyError(operation, table, 'unknown', 'unknown');
    }
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const match = error.message.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    if (match) {
      throw new UniqueConstraintError(operation, table, match[2], 'unknown');
    }
  }
  
  if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    const match = error.message.match(/NOT NULL constraint failed: (\w+)\.(\w+)/);
    if (match) {
      throw new ValidationError(
        `Required field cannot be null: ${match[2]}`,
        operation,
        table,
        match[2],
        null
      );
    }
  }
  
  throw new DALError(
    error.message || 'Unknown database error',
    operation,
    table,
    error
  );
}
