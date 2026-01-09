package org.example.dto;

import java.util.List;
import java.util.UUID;

public record TemplateRequest(
        UUID userId,
        String name,
        List<TemplateExerciseBlock> exercises
) {}
