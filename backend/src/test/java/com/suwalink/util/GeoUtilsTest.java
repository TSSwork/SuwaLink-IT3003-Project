package com.suwalink.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GeoUtilsTest {

    @Test
    void colomboToKandyIsAbout94Km() {
        double km = GeoUtils.haversineKm(6.9271, 79.8612, 7.2906, 80.6337);
        assertThat(km).isBetween(93.0, 96.0);
    }
}
