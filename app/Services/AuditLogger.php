<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    private static array $sensitiveFields = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'remember_token',
        'api_token',
        'token',
        'secret',
        'api_key',
    ];

    public static function log(
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        string $description = '',
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $userId = null,
    ): AuditLog {
        $oldValues = self::filterSensitive($oldValues);
        $newValues = self::filterSensitive($newValues);

        return AuditLog::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    public static function created(Model $model, string $description = ''): AuditLog
    {
        $entityType = class_basename($model);
        $name = self::getEntityName($model);

        return self::log(
            action: 'created',
            entityType: $entityType,
            entityId: $model->getKey(),
            description: $description ?: "Created {$entityType} \"{$name}\"",
            newValues: self::getAttributes($model),
        );
    }

    public static function updated(Model $model, array $changes, string $description = ''): AuditLog
    {
        $entityType = class_basename($model);
        $name = self::getEntityName($model);
        $oldValues = [];
        $newValues = [];

        foreach ($changes as $key => $value) {
            if (in_array($key, ['updated_at', 'created_at'])) {
                continue;
            }
            $oldValues[$key] = $model->getOriginal($key);
            $newValues[$key] = $value;
        }

        if (empty($oldValues) && empty($newValues)) {
            return self::log(
                action: 'updated',
                entityType: $entityType,
                entityId: $model->getKey(),
                description: $description ?: "Updated {$entityType} \"{$name}\"",
            );
        }

        return self::log(
            action: 'updated',
            entityType: $entityType,
            entityId: $model->getKey(),
            description: $description ?: "Updated {$entityType} \"{$name}\"",
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public static function deleted(Model $model, string $description = ''): AuditLog
    {
        $entityType = class_basename($model);
        $name = self::getEntityName($model);

        return self::log(
            action: 'deleted',
            entityType: $entityType,
            entityId: $model->getKey(),
            description: $description ?: "Deleted {$entityType} \"{$name}\"",
            oldValues: self::getAttributes($model),
        );
    }

    public static function restored(Model $model, string $description = ''): AuditLog
    {
        $entityType = class_basename($model);
        $name = self::getEntityName($model);

        return self::log(
            action: 'restored',
            entityType: $entityType,
            entityId: $model->getKey(),
            description: $description ?: "Restored {$entityType} \"{$name}\"",
            newValues: self::getAttributes($model),
        );
    }

    public static function login($user): AuditLog
    {
        return self::log(
            action: 'login',
            description: "User \"{$user->name}\" logged in",
            userId: $user->id,
        );
    }

    public static function failedLogin(string $email): AuditLog
    {
        return self::log(
            action: 'failed_login',
            description: "Failed login attempt for \"{$email}\"",
        );
    }

    public static function logout(): AuditLog
    {
        $user = auth()->user();

        $name = $user->name ?? 'unknown';

        return self::log(
            action: 'logout',
            description: "User \"{$name}\" logged out",
            userId: $user?->id,
        );
    }

    public static function action(string $action, string $entityType, ?int $entityId, string $description, ?array $oldValues = null, ?array $newValues = null): AuditLog
    {
        return self::log(
            action: $action,
            entityType: $entityType,
            entityId: $entityId,
            description: $description,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    private static function getEntityName(Model $model): string
    {
        foreach (['name', 'title', 'reference', 'email'] as $field) {
            if (isset($model->{$field}) && $model->{$field} !== null) {
                return (string) $model->{$field};
            }
        }

        return '#' . $model->getKey();
    }

    private static function getAttributes(Model $model): array
    {
        $attributes = $model->getAttributes();

        unset($attributes['created_at'], $attributes['updated_at']);

        return $attributes;
    }

    private static function filterSensitive(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        foreach (self::$sensitiveFields as $field) {
            unset($data[$field]);
        }

        return $data;
    }
}
