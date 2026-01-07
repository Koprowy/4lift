package org.example.dto;

import java.util.List;
import java.util.UUID;

public record ExerciseBlock(
        String name,
        int order,
        List<SetBlock> sets
) {}


