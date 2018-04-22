#!/usr/bin/python
# -*- coding: utf-8 -*-

"""Pruebas unitarias de libkarel."""

import unittest

import libkarel
from libkarel import Direccion


class TestLibKarelInput(unittest.TestCase):
    """Prueba libkarel.KarelInput."""

    def test_basic(self):
        """Prueba básica."""
        karel_in = libkarel.KarelInput('''
<ejecucion>
  <condiciones instruccionesMaximasAEjecutar="10000000" longitudStack="65000" />
  <mundos>
    <mundo nombre="mundo_0" ancho="100" alto="100">
    </mundo>
  </mundos>
  <programas tipoEjecucion="CONTINUA" intruccionesCambioContexto="1" milisegundosParaPasoAutomatico="0">
    <programa nombre="p1" ruta="{$2$}" mundoDeEjecucion="mundo_0" xKarel="1" yKarel="1" direccionKarel="NORTE" mochilaKarel="0" >
      <despliega tipo="MUNDO" />
    </programa>
  </programas>
</ejecucion>
        ''')
        # Dimensiones del mundo
        self.assertEqual(karel_in.w, 100)
        self.assertEqual(karel_in.h, 100)

        # Estado inicial de Karel
        self.assertEqual(karel_in.x, 1)
        self.assertEqual(karel_in.y, 1)
        self.assertEqual(karel_in.mochila, 0)
        self.assertEqual(karel_in.direccion, 'NORTE')

        # Despliegas
        self.assertEqual(karel_in.despliega, ['MUNDO'])
        self.assertEqual(karel_in.despliega_orientacion, False)
        self.assertEqual(karel_in.despliega_mundo, True)
        self.assertEqual(karel_in.despliega_posicion, False)
        self.assertEqual(karel_in.despliega_instrucciones, False)

        # Listas
        self.assertEqual(karel_in.lista_zumbadores, {})
        self.assertEqual(karel_in.lista_dump, set())

        # API público
        self.assertEqual(karel_in.zumbadores(1, 1), 0)
        self.assertEqual(karel_in.dump(1, 1), False)

    def test_walls(self):
        """Prueba de las paredes."""

        karel_in = libkarel.KarelInput('''
<ejecucion>
  <condiciones instruccionesMaximasAEjecutar="10000000" longitudStack="65000"></condiciones>
  <mundos>
    <mundo nombre="mundo_0" ancho="3" alto="2">
      <pared x1="1" y1="0" y2="1"></pared>
      <pared x1="1" y1="1" x2="2"></pared>
      <pared x1="2" y1="1" y2="2"></pared>
    </mundo>
  </mundos>
  <programas tipoEjecucion="CONTINUA" intruccionesCambioContexto="1" milisegundosParaPasoAutomatico="0">
    <programa nombre="p1" ruta="{$2$}" mundoDeEjecucion="mundo_0" xKarel="1" yKarel="1" direccionKarel="NORTE" mochilaKarel="0"></programa>
  </programas>
</ejecucion>
        ''')

        self.assertEqual(karel_in.paredes(1, 1),
                         Direccion.SUR | Direccion.OESTE | Direccion.ESTE)
        self.assertEqual(karel_in.paredes(2, 1),
                         Direccion.SUR | Direccion.OESTE | Direccion.NORTE)
        self.assertEqual(karel_in.paredes(3, 1),
                         Direccion.SUR | Direccion.ESTE)
        self.assertEqual(karel_in.paredes(1, 2),
                         Direccion.NORTE | Direccion.OESTE)
        self.assertEqual(karel_in.paredes(2, 2),
                         Direccion.SUR | Direccion.ESTE | Direccion.NORTE)
        self.assertEqual(karel_in.paredes(3, 2),
                         Direccion.NORTE | Direccion.OESTE | Direccion.ESTE)


class TestLibKarelOutput(unittest.TestCase):
    """Prueba libkarel.KarelOutput"""

    def test_basic(self):
        """Prueba básica."""

        karel_out = libkarel.KarelOutput('''
<resultados>
        <mundos>
                <mundo nombre="mundo_0"/>
        </mundos>
        <programas>
                <programa nombre="p1" resultadoEjecucion="FIN PROGRAMA"/>
        </programas>
</resultados>
        ''')

        # Estado de la ejecución
        self.assertEqual(karel_out.resultado, 'FIN PROGRAMA')
        self.assertEqual(karel_out.error, False)

        # Despliegas
        self.assertEqual(karel_out.x, None)
        self.assertEqual(karel_out.y, None)
        self.assertEqual(karel_out.direccion, None)

        # API público
        self.assertEqual(karel_out.zumbadores(1, 1), 0)

    def test_instructions(self):
        """Prueba del dump de instrucciones."""

        karel_out = libkarel.KarelOutput('''
<resultados>
    <programas>
        <programa nombre="p1" resultadoEjecucion="FIN PROGRAMA">
            <karel x="10" y="15"/>
            <instrucciones avanza="42" gira_izquierda="1" coge_zumbador="0"/>
        </programa>
    </programas>
</resultados>
        ''')

        # Estado de la ejecución.
        self.assertEqual(karel_out.x, 10)
        self.assertEqual(karel_out.y, 15)

        # Instrucciones.
        self.assertEqual(karel_out.instrucciones['avanza'], 42)
        self.assertEqual(karel_out.instrucciones['gira_izquierda'], 1)
        self.assertEqual(karel_out.instrucciones['coge_zumbador'], 0)
        self.assertEqual(karel_out.instrucciones['deja_zumbador'], None)


if __name__ == '__main__':
    unittest.main()

# vim: tabstop=4 expandtab shiftwidth=4 softtabstop=4
