package org.example.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;

@Service
public class CoachAiService {

    public record Result(boolean ok, String canonical, String youtubeQuery) {}

    // Alias -> canonical
    private static final Map<String, String> ALIASES = new HashMap<>();
    static {
        // BENCH / KLATA
        add("klata lawa", "Wyciskanie sztangi leżąc");
        add("klata ława", "Wyciskanie sztangi leżąc");
        add("wyciskanie lezac", "Wyciskanie sztangi leżąc");
        add("wyciskanie leżąc", "Wyciskanie sztangi leżąc");
        add("bench", "Wyciskanie sztangi leżąc");
        add("bench press", "Wyciskanie sztangi leżąc");
        add("lawa", "Wyciskanie sztangi leżąc");

        // OHP
        add("ohp", "Wyciskanie nad głowę (OHP)");
        add("wyciskanie nad glowe", "Wyciskanie nad głowę (OHP)");
        add("wyciskanie nad głowę", "Wyciskanie nad głowę (OHP)");

        // SQUAT
        add("przysiad", "Przysiad ze sztangą");
        add("przysiady", "Przysiad ze sztangą");
        add("squat", "Przysiad ze sztangą");

        // DEADLIFT / RDL
        add("martwy", "Martwy ciąg");
        add("martwy ciag", "Martwy ciąg");
        add("deadlift", "Martwy ciąg");
        add("rdl", "Martwy ciąg na prostych (RDL)");
        add("martwy na prostych", "Martwy ciąg na prostych (RDL)");

        // ROW
        add("wioslo", "Wiosłowanie sztangą");
        add("wioslowanie", "Wiosłowanie sztangą");
        add("wioslowanie sztanga", "Wiosłowanie sztangą");
        add("barbell row", "Wiosłowanie sztangą");

        // PULLUP/LAT PULLDOWN
        add("podciaganie", "Podciąganie na drążku");
        add("podciaganie na drazku", "Podciąganie na drążku");
        add("pull up", "Podciąganie na drążku");
        add("lat pulldown", "Ściąganie drążka wyciągu górnego");
        add("sciaganie drazka", "Ściąganie drążka wyciągu górnego");

        // BICEPS/TRICEPS
        add("biceps", "Uginanie ramion (biceps)");
        add("uginanie", "Uginanie ramion (biceps)");
        add("triceps", "Prostowanie ramion (triceps)");
        add("prostowanie na triceps", "Prostowanie ramion (triceps)");
        add("dipy", "Pompki na poręczach (dipy)");
    }

    private static void add(String alias, String canonical) {
        ALIASES.put(norm(alias), canonical);
    }

    public Result resolve(String text, String lang) {
        if (text == null) return new Result(false, null, null);

        String t = norm(text);
        if (t.isBlank() || t.length() < 3) return new Result(false, null, null);

        // 1) Exact alias match
        String canonical = ALIASES.get(t);

        // 2) Contains match (prosty fuzzy)
        if (canonical == null) {
            canonical = containsHeuristic(t);
        }

        if (canonical == null) return new Result(false, null, null);

        // query na YT: PL + trochę “form/technika”
        String youtubeQuery = switch (canonical) {
            case "Wyciskanie sztangi leżąc" -> "wyciskanie sztangi leżąc technika";
            case "Wyciskanie nad głowę (OHP)" -> "wyciskanie nad głowę ohp technika";
            case "Przysiad ze sztangą" -> "przysiad ze sztangą technika";
            case "Martwy ciąg" -> "martwy ciąg technika";
            case "Martwy ciąg na prostych (RDL)" -> "rdl martwy ciąg na prostych technika";
            case "Wiosłowanie sztangą" -> "wiosłowanie sztangą technika";
            case "Podciąganie na drążku" -> "podciąganie na drążku technika";
            case "Ściąganie drążka wyciągu górnego" -> "ściąganie drążka technika";
            case "Uginanie ramion (biceps)" -> "uginanie ramion biceps technika";
            case "Prostowanie ramion (triceps)" -> "prostowanie ramion triceps technika";
            case "Pompki na poręczach (dipy)" -> "dipy technika";
            default -> canonical + " technika";
        };

        return new Result(true, canonical, youtubeQuery);
    }

    private String containsHeuristic(String t) {
        // bardzo proste reguły “jak AI”
        if (t.contains("klata") && t.contains("lawa")) return "Wyciskanie sztangi leżąc";
        if (t.contains("bench")) return "Wyciskanie sztangi leżąc";

        if (t.contains("ohp") || (t.contains("wyciskanie") && t.contains("glowe"))) return "Wyciskanie nad głowę (OHP)";

        if (t.contains("przys")) return "Przysiad ze sztangą";
        if (t.contains("dead") || (t.contains("martwy") && t.contains("ciag"))) return "Martwy ciąg";
        if (t.contains("rdl") || t.contains("na prostych")) return "Martwy ciąg na prostych (RDL)";

        if (t.contains("wios")) return "Wiosłowanie sztangą";
        if (t.contains("podciag")) return "Podciąganie na drążku";
        if (t.contains("sciag") && t.contains("drazk")) return "Ściąganie drążka wyciągu górnego";

        if (t.contains("biceps") || t.contains("uginanie")) return "Uginanie ramion (biceps)";
        if (t.contains("triceps") || t.contains("prostowanie")) return "Prostowanie ramion (triceps)";

        return null;
    }

    private static String norm(String s) {
        String x = s.trim().toLowerCase(Locale.ROOT);
        x = Normalizer.normalize(x, Normalizer.Form.NFD).replaceAll("\\p{M}", ""); // usuwa polskie znaki
        x = x.replaceAll("[^a-z0-9\\s]", " ");
        x = x.replaceAll("\\s+", " ").trim();
        return x;
    }
}
