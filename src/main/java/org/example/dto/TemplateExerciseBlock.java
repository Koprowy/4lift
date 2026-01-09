package org.example.dto;

import java.util.List;

public record TemplateExerciseBlock(
        String name,
        int order,
        List<TemplateSetBlock> sets
) {}
