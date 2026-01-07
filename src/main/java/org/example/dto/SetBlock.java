package org.example.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SetBlock(
        BigDecimal weight,
        int reps,
        int order,
        boolean isDrop,
        UUID parentSetId
) {}
